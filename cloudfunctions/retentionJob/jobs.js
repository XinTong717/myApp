// ---------------------------------------------------------------------------
// 保留策略的具体 job 实现。每个 job 形如 async (ctx) => result。
// ctx = { db, _, dryRun, now, RETENTION, LIMITS, SAFETY }
//
// 约定：
//   - dry-run 下任何 job 都不写库，只返回 would* 计数。
//   - 删除类 job 受 LIMITS.maxDocsPerJob 上限保护，超出返回 hasMore=true，下次运行继续。
//   - report-only job 永不删除。
// ---------------------------------------------------------------------------

const { sweepDelete, safeCount, removeOne, updateOne, daysAgo } = require('./lib/sweep')

// 终态状态：可在保留期后清理的提交状态。
const EVENT_SUBMISSION_DELETABLE = ['rejected']
const SCHOOL_SUBMISSION_DELETABLE = ['rejected', 'duplicate']
// 需保留为线上内容/溯源、注销时仅匿名化提交者身份的提交状态。
const EVENT_SUBMISSION_KEEP_ANON = ['merged'] // merged 是 getEventContactInfo 的活跃数据源，绝不删
const SCHOOL_SUBMISSION_KEEP_ANON = ['processed', 'merged']

// ---- 低/中风险：按时间窗删除 ------------------------------------------------

async function rateLimits(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.rateLimits.retentionDays)
  const res = await sweepDelete({
    db,
    collection: 'rate_limits',
    where: { updatedAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'rateLimits', cutoff: cutoff.toISOString(), ...res }
}

async function clientErrorLogs(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.clientErrorLogs.retentionDays)
  const res = await sweepDelete({
    db,
    collection: 'client_error_logs',
    where: { createdAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'clientErrorLogs', cutoff: cutoff.toISOString(), ...res }
}

async function rejectedEventSubmissions(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.rejectedEventSubmissions.retentionDays)
  const res = await sweepDelete({
    db,
    collection: 'event_submissions',
    where: { status: _.in(EVENT_SUBMISSION_DELETABLE), updatedAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'rejectedEventSubmissions', cutoff: cutoff.toISOString(), ...res }
}

async function rejectedSchoolSubmissions(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.rejectedSchoolSubmissions.retentionDays)
  const res = await sweepDelete({
    db,
    collection: 'school_submissions',
    where: { status: _.in(SCHOOL_SUBMISSION_DELETABLE), updatedAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'rejectedSchoolSubmissions', cutoff: cutoff.toISOString(), ...res }
}

async function staleInterestToggles(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.staleInterestToggles.retentionDays)
  // 只清理“已取消”的历史兴趣行（status != interested），保留有效收藏。
  const res = await sweepDelete({
    db,
    collection: 'event_interest',
    where: { status: _.neq('interested'), updatedAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'staleInterestToggles', cutoff: cutoff.toISOString(), ...res }
}

// ---- 高风险：账号注销级联清除 ----------------------------------------------

async function deleteAllWhere(db, collection, where, dryRun, cap, batchSize) {
  if (dryRun) return { matched: await safeCount(db, collection, where), deleted: 0 }
  let deleted = 0
  let scanned = 0
  for (;;) {
    if (scanned >= cap) break
    const pageSize = Math.min(batchSize, cap - scanned)
    const res = await db.collection(collection).where(where).field({ _id: true }).limit(pageSize).get()
    const docs = res.data || []
    if (docs.length === 0) break
    scanned += docs.length
    const r = await Promise.all(docs.map((d) => removeOne(db, collection, d._id)))
    deleted += r.filter(Boolean).length
    if (docs.length < pageSize) break
  }
  return { matched: deleted, deleted }
}

async function anonymizeSubmitterWhere(db, collection, where, dryRun, cap, batchSize) {
  const patch = {
    openid: '',
    submitterDisplayName: '',
    submitterCity: '',
    submitterRoles: [],
    submitterDeletionPurgedAt: db.serverDate(),
  }
  if (dryRun) return { matched: await safeCount(db, collection, where), updated: 0 }
  let updated = 0
  let scanned = 0
  for (;;) {
    if (scanned >= cap) break
    const pageSize = Math.min(batchSize, cap - scanned)
    const res = await db.collection(collection).where(where).field({ _id: true }).limit(pageSize).get()
    const docs = res.data || []
    if (docs.length === 0) break
    scanned += docs.length
    const r = await Promise.all(docs.map((d) => updateOne(db, collection, d._id, patch)))
    updated += r.filter(Boolean).length
    if (docs.length < pageSize) break
  }
  return { matched: updated, updated }
}

// 处理单个已过宽限期的注销请求：级联清除该 openid 的 PII。
async function purgeAccount(ctx, request) {
  const { db, _, dryRun, LIMITS } = ctx
  const openid = String(request.openid || '').trim()
  if (!openid) return { requestId: request._id, skipped: true, reason: 'missing openid' }

  const cap = LIMITS.maxDocsPerJob
  const batch = LIMITS.batchSize
  const steps = {}

  // 1) 用户主档：硬删（按 openid 查 _id，兼容 _id=openid 与历史随机 _id）。
  steps.users = await deleteAllWhere(db, 'users', { openid }, dryRun, 5, batch)

  // 2) 兴趣、限流、法务同意、安全关系：按 openid 级联删除。
  steps.eventInterest = await deleteAllWhere(db, 'event_interest', { openid }, dryRun, cap, batch)
  steps.rateLimits = await deleteAllWhere(db, 'rate_limits', { openid }, dryRun, cap, batch)
  steps.legalConsents = await deleteAllWhere(db, 'legal_consents', { openid }, dryRun, cap, batch)
  steps.safetyOwned = await deleteAllWhere(db, 'safety_relations', { ownerOpenid: openid }, dryRun, cap, batch)
  steps.safetyTargeted = await deleteAllWhere(db, 'safety_relations', { targetOpenid: openid }, dryRun, cap, batch)

  // 3) 提交：终态草稿/被拒删除；merged/processed 仅匿名化提交者身份（保留线上内容，flag 给人工复核）。
  steps.eventSubDeleted = await deleteAllWhere(db, 'event_submissions', { openid, status: _.nin(EVENT_SUBMISSION_KEEP_ANON) }, dryRun, cap, batch)
  steps.eventSubAnon = await anonymizeSubmitterWhere(db, 'event_submissions', { openid, status: _.in(EVENT_SUBMISSION_KEEP_ANON) }, dryRun, cap, batch)
  steps.schoolSubDeleted = await deleteAllWhere(db, 'school_submissions', { openid, status: _.nin(SCHOOL_SUBMISSION_KEEP_ANON) }, dryRun, cap, batch)
  steps.schoolSubAnon = await anonymizeSubmitterWhere(db, 'school_submissions', { openid, status: _.in(SCHOOL_SUBMISSION_KEEP_ANON) }, dryRun, cap, batch)

  // 4) 纠错：匿名化 openid（保留内容供运营消费）。
  steps.schoolCorrections = await anonymizeSubmitterWhere(db, 'school_corrections', { openid }, dryRun, cap, batch)
  steps.eventCorrections = await anonymizeSubmitterWhere(db, 'event_corrections', { openid }, dryRun, cap, batch)

  // 注意：user_reports 故意不动——举报是安全/合规证据，按安全保留期单独治理（governanceReport 上报）。

  // 5) 标记注销请求为已完成，并最小化其自身 PII（保留 openid+时间戳作为履行删除的凭证）。
  if (!dryRun) {
    await updateOne(db, 'account_deletion_requests', request._id, {
      status: 'completed',
      handledBy: 'retention-job',
      handledAt: db.serverDate(),
      displayName: '',
      city: '',
      note: '',
      adminNote: 'Cascade-purged by retentionJob; user PII removed, reports retained for safety.',
      purgeSummary: steps,
      updatedAt: db.serverDate(),
    })
  }

  return { requestId: request._id, openid: dryRun ? openid : `${openid.slice(0, 6)}***`, dryRun, steps }
}

async function accountDeletionCompletion(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS, SAFETY } = ctx

  if (!SAFETY.enableAccountPurge) {
    // 即使在 dry-run，也明确告诉运营这个最危险的 job 还没被显式打开。
    const pending = await safeCount(db, 'account_deletion_requests', {
      status: 'pending',
      createdAt: _.lt(daysAgo(now, RETENTION.accountDeletion.graceDays)),
    })
    return {
      job: 'accountDeletionCompletion',
      skipped: true,
      reason: 'RETENTION_ENABLE_ACCOUNT_PURGE 未开启',
      pendingPastGrace: pending,
    }
  }

  const cutoff = daysAgo(now, RETENTION.accountDeletion.graceDays)
  const res = await db.collection('account_deletion_requests')
    .where({ status: 'pending', createdAt: _.lt(cutoff) })
    .orderBy('createdAt', 'asc')
    .limit(LIMITS.maxAccountsPerRun)
    .get()

  const requests = res.data || []
  const accounts = []
  for (const request of requests) {
    try {
      accounts.push(await purgeAccount(ctx, request))
    } catch (err) {
      console.error('purgeAccount failed:', request._id, err && err.message ? err.message : err)
      accounts.push({ requestId: request._id, error: true, message: err && err.message ? err.message : 'purge failed' })
    }
  }

  const remaining = await safeCount(db, 'account_deletion_requests', { status: 'pending', createdAt: _.lt(cutoff) })
  return {
    job: 'accountDeletionCompletion',
    cutoff: cutoff.toISOString(),
    graceDays: RETENTION.accountDeletion.graceDays,
    processed: accounts.length,
    accounts,
    hasMore: remaining > 0,
  }
}

async function completedDeletionRequestArchival(ctx) {
  const { db, _, dryRun, now, RETENTION, LIMITS } = ctx
  const cutoff = daysAgo(now, RETENTION.completedDeletionRequests.retentionDays)
  // 已完成且超过合规保留期的注销凭证，最终删除。
  const res = await sweepDelete({
    db,
    collection: 'account_deletion_requests',
    where: { status: 'completed', handledAt: _.lt(cutoff) },
    dryRun,
    batchSize: LIMITS.batchSize,
    maxDocs: LIMITS.maxDocsPerJob,
  })
  return { job: 'completedDeletionRequestArchival', cutoff: cutoff.toISOString(), ...res }
}

// ---- report-only：只统计、绝不删 -------------------------------------------

async function governanceReport(ctx) {
  const { db, _, now, RETENTION } = ctx
  const r = RETENTION.reportOnly
  const stalePendingCutoff = daysAgo(now, r.stalePendingSubmissionDays)
  const reportsCutoff = daysAgo(now, r.userReportsDays)
  const correctionsCutoff = daysAgo(now, r.correctionsDays)
  const auditCutoff = daysAgo(now, r.adminAuditLogsDays)

  const [
    pendingDeletion,
    stalePendingEvents,
    stalePendingSchools,
    userReportsTotal,
    userReportsOld,
    schoolCorrectionsOld,
    eventCorrectionsOld,
    auditLogsOld,
  ] = await Promise.all([
    safeCount(db, 'account_deletion_requests', { status: 'pending' }),
    safeCount(db, 'event_submissions', { status: 'pending', createdAt: _.lt(stalePendingCutoff) }),
    safeCount(db, 'school_submissions', { status: 'pending', createdAt: _.lt(stalePendingCutoff) }),
    safeCount(db, 'user_reports', {}),
    safeCount(db, 'user_reports', { status: 'pending', createdAt: _.lt(reportsCutoff) }),
    safeCount(db, 'school_corrections', { createdAt: _.lt(correctionsCutoff) }),
    safeCount(db, 'event_corrections', { createdAt: _.lt(correctionsCutoff) }),
    safeCount(db, 'admin_audit_logs', { createdAt: _.lt(auditCutoff) }),
  ])

  const flags = []
  if (pendingDeletion > 0) flags.push(`有 ${pendingDeletion} 条待处理注销请求`)
  if (stalePendingEvents > 0) flags.push(`有 ${stalePendingEvents} 条活动提交滞留待审 > ${r.stalePendingSubmissionDays} 天`)
  if (stalePendingSchools > 0) flags.push(`有 ${stalePendingSchools} 条学习社区提交滞留待审 > ${r.stalePendingSubmissionDays} 天`)
  if (userReportsOld > 0) flags.push(`有 ${userReportsOld} 条未处理举报 > ${r.userReportsDays} 天（需人工评估保留/匿名）`)

  return {
    job: 'governanceReport',
    reportOnly: true,
    metrics: {
      pendingDeletionRequests: pendingDeletion,
      stalePendingEventSubmissions: stalePendingEvents,
      stalePendingSchoolSubmissions: stalePendingSchools,
      userReportsTotal,
      userReportsPendingOld: userReportsOld,
      schoolCorrectionsOld,
      eventCorrectionsOld,
      adminAuditLogsOld: auditLogsOld,
    },
    flags,
  }
}

const JOBS = {
  rateLimits,
  clientErrorLogs,
  rejectedEventSubmissions,
  rejectedSchoolSubmissions,
  staleInterestToggles,
  accountDeletionCompletion,
  completedDeletionRequestArchival,
  governanceReport,
}

module.exports = { JOBS }
