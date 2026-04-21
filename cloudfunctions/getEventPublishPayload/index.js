const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const EVENT_TYPE_MAP = {
  '工作坊': 'workshop',
  '线下聚会': 'meetup',
  '线上活动': 'online',
  '家庭活动': 'family',
  '项目招募': 'community_program',
  '圆桌讨论': 'discussion',
  '夜聊/讨论': 'discussion',
  '其他': 'meetup',
}

async function getActiveAdmin(openid) {
  const res = await db.collection('admin_users')
    .where({ openid, isActive: true })
    .limit(1)
    .get()

  return res.data[0] || null
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function firstEventType(submission) {
  const eventTypes = Array.isArray(submission.eventTypes) ? submission.eventTypes.filter(Boolean) : []
  if (eventTypes.length > 0) {
    return eventTypes.find((item) => !String(item).startsWith('其他：')) || eventTypes[0]
  }
  return String(submission.eventType || '').trim()
}

function normalizeEventType(submission) {
  return EVENT_TYPE_MAP[firstEventType(submission)] || 'meetup'
}

function stringifyLabels(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' / ')
  }
  return String(value || '').trim()
}

function buildEventStatus(submission) {
  const now = Date.now()
  const start = parseDate(submission.startTime)
  const end = parseDate(submission.endTime)

  if (start && start.getTime() > now) return 'upcoming'
  if (start && end && start.getTime() <= now && end.getTime() >= now) return 'ongoing'
  if (end && end.getTime() < now) return 'ended'
  if (normalizeEventType(submission) === 'community_program') return 'recruiting'
  return 'upcoming'
}

function buildLocation(submission) {
  const location = String(submission.location || '').trim()
  const province = String(submission.province || '').trim()
  const city = String(submission.city || '').trim()
  if (submission.isOnline) return location || '线上'
  return location || [province, city].filter(Boolean).join('') || '待定'
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
  if (officialUrl) lines.push(`公开主页或报名链接：${officialUrl}`)
  if (signupNote) lines.push(`报名方式补充说明：${signupNote}`)
  if (organizerContact) lines.push(`组织者联系方式：${organizerContact}`)
  return lines.length > 0 ? lines.join('\n') : '请等待更多公开信息'
}

function buildDescription(submission) {
  const audienceWho = stringifyLabels(submission.audienceWhoTags || submission.audienceWho) || '未注明'
  const minAge = String(submission.minAgeRequirement || '').trim() || '未注明'
  const eventTypes = stringifyLabels(submission.eventTypes || submission.eventType)
  const description = String(submission.description || '').trim() || '暂无详细介绍'
  const signupNote = String(submission.signupNote || '').trim() || '请查看公开主页或活动说明'
  const officialUrl = String(submission.officialUrl || '').trim() || '未提供'

  return [
    eventTypes ? `活动类型：${eventTypes}` : '',
    `参与对象：${audienceWho}`,
    `最低年龄要求：${minAge}`,
    '',
    '活动简介：',
    description,
    '',
    '报名方式补充说明：',
    signupNote,
    '',
    '公开主页或报名链接：',
    officialUrl,
  ].filter(Boolean).join('\n')
}

function buildWarnings(submission, payload) {
  const warnings = []
  const start = parseDate(submission.startTime)
  const end = parseDate(submission.endTime)
  const officialUrl = String(submission.officialUrl || '').trim()
  const signupNote = String(submission.signupNote || '').trim()
  const organizerContact = String(submission.organizerContact || '').trim()

  if (!officialUrl && !signupNote && !organizerContact) warnings.push('未提供公开链接、报名说明或组织者联系方式，发布前请确认活动可被用户实际联系到')
  if (!submission.location && !submission.isOnline) warnings.push('线下活动未填写具体地点，当前会用省市兜底')
  if (!submission.endTime) warnings.push('未填写结束时间，前端会按单点开始时间展示')
  if (payload.status === 'ended') warnings.push('该活动时间已过，通常不建议发布到公开活动页')
  if (!start) warnings.push('开始时间格式异常，发布前需人工修正')
  if (submission.endTime && !end) warnings.push('结束时间格式异常，发布前需人工修正')
  if (!submission.organizer) warnings.push('未填写组织者，不建议直接发布')
  if (submission.fee === '付费' && !String(submission.feeDetail || '').trim()) warnings.push('该活动标记为付费，但未填写费用说明')

  return warnings
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const submissionId = String(event.submissionId || '').trim()

  if (!submissionId) return { ok: false, message: '缺少 submissionId' }

  try {
    const admin = await getActiveAdmin(OPENID)
    if (!admin) return { ok: false, message: '无权限访问管理员发布辅助工具' }

    const res = await db.collection('event_submissions').doc(submissionId).get()
    const submission = res.data
    if (!submission) return { ok: false, message: '未找到该活动提交记录' }

    const payload = {
      title: String(submission.title || '').trim(),
      event_type: normalizeEventType(submission),
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

    const warnings = buildWarnings(submission, payload)

    return {
      ok: true,
      admin: { name: admin.name || '', role: admin.role || 'admin' },
      submission: {
        _id: submission._id,
        status: submission.status || 'pending',
        title: submission.title || '',
        province: submission.province || '',
        city: submission.city || '',
        eventType: stringifyLabels(submission.eventTypes || submission.eventType),
        audienceWho: stringifyLabels(submission.audienceWhoTags || submission.audienceWho),
        minAgeRequirement: submission.minAgeRequirement || '',
        organizer: submission.organizer || '',
        organizerContact: submission.organizerContact || '',
        startTime: submission.startTime || '',
        endTime: submission.endTime || '',
        officialUrl: submission.officialUrl || '',
      },
      suggestedEventPayload: payload,
      suggestedReviewUpdate: {
        status: 'merged',
        publishedEventId: null,
        adminNote: '已发布到 events',
      },
      warnings,
    }
  } catch (err) {
    console.error('getEventPublishPayload error:', err)
    return { ok: false, message: '读取提交记录失败，请稍后重试' }
  }
}
