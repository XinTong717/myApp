const EVENT_TYPE_MAP = {
  '工作坊': 'workshop',
  '线下聚会': 'meetup',
  '交友聚会': 'meetup',
  '线上活动': 'online',
  '家庭活动': 'family',
  '项目招募': 'community_program',
  '圆桌讨论': 'discussion',
  '一对一': 'one_on_one',
  '团体': 'group',
  '夜聊/讨论': 'discussion',
  '其他': 'meetup',
}

const SECURITY_RECHECK_REQUIRED_STATUSES = new Set(['check_failed', 'failed', 'error', 'unchecked'])
const SECURITY_BLOCKED_STATUSES = new Set(['blocked', 'review'])

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeLabel(value) {
  return String(value || '').trim()
}

function normalizeLabelArray(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map(normalizeLabel).filter(Boolean)))
}

function stringifyLabels(value) {
  return normalizeLabelArray(value).join(' / ')
}

function firstEventType(submission) {
  const eventTypes = normalizeLabelArray(submission.eventTypes)
  if (eventTypes.length > 0) return eventTypes.find((item) => !String(item).startsWith('其他：')) || eventTypes[0]
  return String(submission.eventType || '').trim()
}

function normalizeEventType(submission) {
  return EVENT_TYPE_MAP[firstEventType(submission)] || 'meetup'
}

function buildEventStatus(submission) {
  if (submission.isRecurring) return 'recurring'
  const signupDeadline = parseDate(submission.signupDeadline)
  if (signupDeadline && signupDeadline.getTime() < Date.now()) return 'ended'
  return 'recruiting'
}

function buildLocation(submission) {
  return String(submission.location || '').trim()
}

function buildFee(submission) {
  const fee = String(submission.fee || '').trim()
  const feeDetail = String(submission.feeDetail || '').trim()
  if (!fee) return '费用待确认'
  if (fee === '付费') return feeDetail || '付费'
  return fee
}

function buildContactInfo(submission) {
  const officialUrl = String(submission.officialUrl || '').trim()
  const signupNote = String(submission.signupNote || '').trim()
  const organizerContact = String(submission.organizerContact || '').trim()
  const lines = []
  if (officialUrl) lines.push(`公开链接：${officialUrl}`)
  if (signupNote) lines.push(`报名方式补充说明：${signupNote}`)
  if (organizerContact) lines.push(`组织者联系方式：${organizerContact}`)
  return lines.length > 0 ? lines.join('\n') : '请等待更多公开信息'
}

function buildDescription(submission) {
  return String(submission.description || '').trim() || '暂无详细介绍'
}

function buildEventPayload(submission) {
  const eventTypes = normalizeLabelArray(submission.eventTypes || submission.eventType)
  const audienceWho = normalizeLabelArray(submission.audienceWhoTags || submission.audienceWho)
  const minAgeRequirement = String(submission.minAgeRequirement || '').trim()
  const maxAgeRequirement = String(submission.maxAgeRequirement || '').trim()
  const signupDeadline = String(submission.signupDeadline || '').trim()
  const recurrencePattern = String(submission.recurrencePattern || '').trim()
  const feeCategory = String(submission.fee || '').trim() || '费用待确认'

  return {
    title: String(submission.title || '').trim(),
    province: String(submission.province || '').trim(),
    city: String(submission.city || '').trim(),
    event_type: normalizeEventType(submission),
    event_types: eventTypes,
    audience_who: audienceWho,
    min_age_requirement: minAgeRequirement,
    max_age_requirement: maxAgeRequirement,
    signup_deadline: signupDeadline,
    is_recurring: !!submission.isRecurring,
    recurrence_pattern: recurrencePattern,
    fee_category: feeCategory,
    early_bird_price: String(submission.earlyBirdPrice || '').trim(),
    early_bird_deadline: String(submission.earlyBirdDeadline || '').trim(),
    description: buildDescription(submission),
    start_time: String(submission.startTime || '').trim(),
    end_time: String(submission.endTime || '').trim(),
    location: buildLocation(submission),
    fee: buildFee(submission),
    status: buildEventStatus(submission),
    organizer: String(submission.organizer || '').trim(),
    is_online: !!submission.isOnline,
    contact_info: buildContactInfo(submission),
  }
}

function readContentSecurityStatus(submission) {
  return String(submission.contentSecurityStatus || '').trim().toLowerCase()
}

function buildWarnings(submission, payload) {
  const warnings = []
  const start = parseDate(submission.startTime)
  const end = parseDate(submission.endTime)
  const signupDeadline = parseDate(submission.signupDeadline)
  const earlyBirdDeadline = parseDate(submission.earlyBirdDeadline)
  const earlyBirdPrice = String(submission.earlyBirdPrice || '').trim()
  const officialUrl = String(submission.officialUrl || '').trim()
  const signupNote = String(submission.signupNote || '').trim()
  const organizerContact = String(submission.organizerContact || '').trim()
  const contentSecurityStatus = readContentSecurityStatus(submission)
  if (!officialUrl && !signupNote && !organizerContact) warnings.push('未提供公开链接、报名说明或组织者联系方式，发布前请确认活动可被用户实际联系到')
  if (!submission.location && !submission.isOnline) warnings.push('线下活动未填写具体地点；列表会用所在城市兜底，详情页会显示未填写')
  if (!submission.endTime) warnings.push('未填写结束日期，前端会按单日活动展示')
  if (payload.status === 'ended') warnings.push('该活动报名已截止，通常不建议作为招募中活动发布')
  if (!start) warnings.push('开始日期格式异常，发布前需人工修正')
  if (submission.endTime && !end) warnings.push('结束日期格式异常，发布前需人工修正')
  if (submission.signupDeadline && !signupDeadline) warnings.push('报名截止日期格式异常，发布前需人工修正')
  if (!!earlyBirdPrice !== !!String(submission.earlyBirdDeadline || '').trim()) warnings.push('早鸟价格和截止日期没有成对填写')
  if (submission.earlyBirdDeadline && !earlyBirdDeadline) warnings.push('早鸟截止日期格式异常，发布前需人工修正')
  if (earlyBirdDeadline && earlyBirdDeadline.getTime() < Date.now()) warnings.push('早鸟截止日期已过，列表将只显示常规费用')
  if (submission.isRecurring && !submission.recurrencePattern) warnings.push('周期性活动未填写周期时间')
  if (!submission.organizer) warnings.push('未填写组织者，不建议直接发布')
  if (submission.fee === '付费' && !String(submission.feeDetail || '').trim()) warnings.push('该活动标记为付费，但未填写费用说明')
  if (SECURITY_RECHECK_REQUIRED_STATUSES.has(contentSecurityStatus)) warnings.push('内容安全检查曾失败或未完成，发布前需要重新检查或使用强制发布并留痕')
  return warnings
}

function buildBlockingErrors(submission, payload, options = {}) {
  const errors = []
  const start = parseDate(payload.start_time)
  const end = parseDate(payload.end_time)
  const signupDeadline = parseDate(payload.signup_deadline)
  const earlyBirdDeadline = parseDate(payload.early_bird_deadline)
  const contentSecurityStatus = readContentSecurityStatus(submission)
  const allowSecurityForce = !!options.allowSecurityForce
  if (!payload.title) errors.push('缺少活动标题')
  if (!payload.organizer) errors.push('缺少组织者')
  if (!start) errors.push('开始日期格式异常')
  if (payload.end_time && !end) errors.push('结束日期格式异常')
  if (start && end && end.getTime() < start.getTime()) errors.push('结束日期早于开始日期')
  if (payload.signup_deadline && !signupDeadline) errors.push('报名截止日期格式异常')
  if (!!payload.early_bird_price !== !!payload.early_bird_deadline) errors.push('早鸟价格和截止日期需成对填写')
  if (payload.early_bird_deadline && !earlyBirdDeadline) errors.push('早鸟截止日期格式异常')
  if (!String(submission.officialUrl || submission.signupNote || submission.organizerContact || '').trim()) errors.push('缺少公开链接、报名说明或组织者联系方式')
  if (SECURITY_BLOCKED_STATUSES.has(contentSecurityStatus)) errors.push('内容安全检查未通过')
  if (!allowSecurityForce && SECURITY_RECHECK_REQUIRED_STATUSES.has(contentSecurityStatus)) errors.push('内容安全检查未完成，请重新检查或使用强制发布')
  return errors
}

module.exports = {
  buildBlockingErrors,
  buildEventPayload,
  buildWarnings,
  buildContactInfo,
  buildDescription,
  buildEventStatus,
  buildFee,
  buildLocation,
  normalizeEventType,
  parseDate,
  stringifyLabels,
}
