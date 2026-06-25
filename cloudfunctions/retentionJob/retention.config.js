// ---------------------------------------------------------------------------
// 可雀 数据保留策略（policy-as-code）
//
// 这里是“保留多久 / 到期怎么处理”的唯一真源。文档侧对应 docs/DATA_RETENTION_POLICY.md。
// 所有周期单位是「天」，都可用环境变量覆盖，便于按法务/运营要求调整而不用改代码。
//
// 安全分级（destructive = 会物理删除数据）：
//   - 低风险删除：ephemeral / operational 数据（rate_limits, client_error_logs）
//   - 中风险删除：终态 UGC（rejected / duplicate 提交、失效的兴趣开关）
//   - 高风险删除：账号注销级联清除（accountDeletionCompletion）—— 需额外开关
//   - report-only：只统计上报、绝不删除（user_reports / corrections / audit logs / 滞留队列）
// ---------------------------------------------------------------------------

function envInt(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

function envFlag(name, fallback = false) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return String(raw).trim().toLowerCase() === 'true'
}

// 各数据类别的保留周期（天）。
const RETENTION = {
  // 限流计数：纯瞬时数据，过期即可删。
  rateLimits: { retentionDays: envInt('RETENTION_RATE_LIMITS_DAYS', 7) },

  // 前端错误面包屑：运维用途，短期保留。
  clientErrorLogs: { retentionDays: envInt('RETENTION_CLIENT_ERROR_LOGS_DAYS', 90) },

  // 被拒活动提交：审核终态，含提交者 openid + 自由文本（PII），审核后保留一段时间留痕再删。
  rejectedEventSubmissions: { retentionDays: envInt('RETENTION_REJECTED_SUBMISSIONS_DAYS', 90) },

  // 被拒 / 重复 学习社区提交：同上。
  rejectedSchoolSubmissions: { retentionDays: envInt('RETENTION_REJECTED_SUBMISSIONS_DAYS', 90) },

  // 失效的兴趣开关（status != interested 的历史行）：行为数据，过期清理。
  staleInterestToggles: { retentionDays: envInt('RETENTION_STALE_INTEREST_DAYS', 90) },

  // 账号注销级联：注销申请提交后，公开资料已即时匿名化；再过 graceDays 才物理级联清除，
  // 留出用户/管理员纠错窗口，也满足“合理期限内删除”的要求。
  accountDeletion: { graceDays: envInt('RETENTION_ACCOUNT_GRACE_DAYS', 30) },

  // 已完成的注销申请：作为“我们已履行删除义务”的合规凭证保留，完成时即最小化 PII，
  // 超过该周期后再删除凭证本身。
  completedDeletionRequests: { retentionDays: envInt('RETENTION_DELETION_REQUEST_DAYS', 1095) }, // 3 年

  // 仅上报（不自动删）——这些类别有安全 / 合规 / 待处理价值，默认只统计、不删除。
  reportOnly: {
    userReportsDays: envInt('RETENTION_USER_REPORTS_DAYS', 365), // 举报：安全证据，1 年后再人工评估
    correctionsDays: envInt('RETENTION_CORRECTIONS_DAYS', 180), // 纠错：无终态字段，避免误删未处理反馈
    adminAuditLogsDays: envInt('RETENTION_AUDIT_LOGS_DAYS', 730), // 审计：2 年，launch 期间绝不自动删
    stalePendingSubmissionDays: envInt('RETENTION_STALE_PENDING_DAYS', 60), // 滞留待审：超期即提醒人工
  },
}

// 每次运行的安全上限，避免一次跑挂或误删过多。
const LIMITS = {
  batchSize: envInt('RETENTION_BATCH_SIZE', 200),
  maxDocsPerJob: envInt('RETENTION_MAX_DOCS_PER_JOB', 2000),
  maxAccountsPerRun: envInt('RETENTION_MAX_ACCOUNTS_PER_RUN', 50),
}

// 全局安全开关。
const SAFETY = {
  // dry-run 的解析在 index.js：默认 true，仅当环境变量 RETENTION_DRY_RUN=false 才真正删除。
  // 账号注销级联是最危险的删除，需在 dry-run=false 之外再额外打开这个开关（双重保险）。
  enableAccountPurge: envFlag('RETENTION_ENABLE_ACCOUNT_PURGE', false),
}

// 定时器默认运行的 job 顺序（手动调用可用 event.jobs 覆盖）。
// report-only 的 job 放最后，便于在同一份报告里看到“该删的”和“该关注的”。
const SCHEDULED_JOBS = [
  'rateLimits',
  'clientErrorLogs',
  'rejectedEventSubmissions',
  'rejectedSchoolSubmissions',
  'staleInterestToggles',
  'accountDeletionCompletion',
  'completedDeletionRequestArchival',
  'governanceReport',
]

module.exports = { RETENTION, LIMITS, SAFETY, SCHEDULED_JOBS }
