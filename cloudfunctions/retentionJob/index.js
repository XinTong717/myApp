// ---------------------------------------------------------------------------
// retentionJob 入口：定时触发器 + 手动调用。
//
// 安全姿态：
//   - 默认 dry-run（只统计、写报告，不删数据）。仅当环境变量 RETENTION_DRY_RUN=false 才真删。
//   - 手动调用可用 event.dryRun 显式覆盖；event.jobs 指定只跑某些 job。
//   - 账号注销级联还需额外 RETENTION_ENABLE_ACCOUNT_PURGE=true。
//   - 每次运行都把完整结果写入 retention_runs，并向 admin_audit_logs 落一条审计。
//
// 手动调用示例（CloudBase 云函数测试面板）：
//   { "dryRun": true }                          // 预演全部 job
//   { "dryRun": true, "jobs": ["rateLimits"] }  // 只预演某个 job
//   { "dryRun": false, "jobs": ["clientErrorLogs"] } // 真删某个低风险 job
// ---------------------------------------------------------------------------

const { db, _ } = require('./lib/cloud')
const { RETENTION, LIMITS, SAFETY, SCHEDULED_JOBS } = require('./retention.config')
const { JOBS } = require('./jobs')

function resolveDryRun(event) {
  if (typeof event.dryRun === 'boolean') return event.dryRun
  // 默认安全：只有显式 RETENTION_DRY_RUN=false 才关闭 dry-run。
  return process.env.RETENTION_DRY_RUN !== 'false'
}

function resolveJobNames(event) {
  const requested = Array.isArray(event.jobs) ? event.jobs.filter((j) => typeof j === 'string') : null
  const names = requested && requested.length > 0 ? requested : SCHEDULED_JOBS
  return names.filter((name) => typeof JOBS[name] === 'function')
}

function isTimerTrigger(event) {
  return !!(event && (event.Type === 'Timer' || event.TriggerName || event.triggerName))
}

function affectedOf(result) {
  return Number(result.deleted || 0) + Number(result.updated || 0)
}

function wouldAffectOf(result) {
  return Number(result.wouldDelete || result.wouldUpdate || result.matched || 0)
}

function accumulateAccountSteps(result, totals) {
  if (!Array.isArray(result.accounts)) return
  result.accounts.forEach((acc) => {
    Object.values(acc.steps || {}).forEach((step) => {
      totals.deleted += Number(step.deleted || 0)
      totals.updated += Number(step.updated || 0)
      if (acc.dryRun) totals.wouldAffect += Number(step.matched || 0)
    })
  })
}

async function writeRunRecord(record) {
  await Promise.all([
    db.collection('retention_runs').add({ data: record }).catch((err) => {
      console.warn('retention_runs write skipped:', err && err.message ? err.message : err)
    }),
    db.collection('admin_audit_logs').add({
      data: {
        adminOpenid: 'system:retentionJob',
        adminName: 'retentionJob',
        adminRole: 'system',
        action: 'retention_job_run',
        targetType: 'retention',
        targetId: record.runId,
        metadata: {
          dryRun: record.dryRun,
          trigger: record.trigger,
          jobs: record.jobNames,
          totals: record.totals,
          flags: record.flags,
        },
        createdAt: db.serverDate(),
      },
    }).catch((err) => {
      console.warn('admin_audit_logs write skipped:', err && err.message ? err.message : err)
    }),
  ])
}

exports.main = async (event = {}) => {
  const startedAt = Date.now()
  const runId = `retention-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const dryRun = resolveDryRun(event)
  const trigger = isTimerTrigger(event) ? 'timer' : 'manual'
  const jobNames = resolveJobNames(event)

  const ctx = { db, _, dryRun, now: startedAt, RETENTION, LIMITS, SAFETY }

  const results = []
  const flags = []
  const totals = { deleted: 0, updated: 0, wouldAffect: 0 }

  for (const name of jobNames) {
    try {
      const result = await JOBS[name](ctx)
      results.push(result)
      totals.deleted += Number(result.deleted || 0)
      totals.updated += Number(result.updated || 0)
      totals.wouldAffect += wouldAffectOf(result)
      accumulateAccountSteps(result, totals)
      if (Array.isArray(result.flags)) flags.push(...result.flags)
    } catch (err) {
      console.error(`retention job ${name} failed:`, err)
      results.push({ job: name, error: true, message: err && err.message ? err.message : 'job failed' })
    }
  }

  const record = {
    runId,
    trigger,
    dryRun,
    jobNames,
    startedAt: new Date(startedAt),
    finishedAt: db.serverDate(),
    durationMs: Date.now() - startedAt,
    totals,
    flags,
    results,
    createdAt: db.serverDate(),
  }

  await writeRunRecord(record)

  console.log(`[retentionJob] ${runId} done dryRun=${dryRun} trigger=${trigger} deleted=${totals.deleted} updated=${totals.updated} wouldAffect=${totals.wouldAffect}`)
  return { ok: true, runId, dryRun, trigger, jobNames, totals, flags, results }
}
