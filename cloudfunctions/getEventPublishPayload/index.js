const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const EVENT_TYPE_MAP = {
  '工作坊': 'workshop',
  '线下聚会': 'meetup',
  '线上活动': 'meetup',
  '家庭活动': 'meetup',
  '项目招募': 'community_program',
  '夜聊/讨论': 'meetup',
  '其他': 'meetup',
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeEventType(eventType) {
  return EVENT_TYPE_MAP[String(eventType || '').trim()] || 'meetup'
}

function buildEventStatus(submission) {
  const now = Date.now()
  const start = parseDate(submission.startTime)
  const end = parseDate(submission.endTime)

  if (start && start.getTime() > now) {
    return 'upcoming'
  }

  if (start && end && start.getTime() <= now && end.getTime() >= now) {
    return 'ongoing'
  }

  if (end && end.getTime() < now) {
    return 'ended'
  }

  if (normalizeEventType(submission.eventType) === 'community_program') {
    return 'recruiting'
  }

  return 'upcoming'
}

function buildLocation(submission) {
  const location = String(submission.location || '').trim()
  const province = String(submission.province || '').trim()
  const city = String(submission.city || '').trim()

  if (submission.isOnline) {
    return location || '线上'
  }

  return location || [province, city].filter(Boolean).join('') || '待定'
}

function buildContactInfo(submission) {
  const officialUrl = String(submission.officialUrl || '').trim()
  const signupNote = String(submission.signupNote || '').trim()

  if (officialUrl && signupNote) {
    return `公开链接：${officialUrl}\n报名方式：${signupNote}`
  }

  if (officialUrl) {
    return `公开链接：${officialUrl}`
  }

  if (signupNote) {
    return `报名方式：${signupNote}`
  }

  return '请等待更多公开信息'
}

function buildDescription(submission) {
  const audience = String(submission.audience || '').trim() || '未注明'
  const description = String(submission.description || '').trim() || '暂无详细介绍'
  const signupNote = String(submission.signupNote || '').trim() || '请查看公开链接'
  const officialUrl = String(submission.officialUrl || '').trim() || '未提供'

  return [
    `适合人群：${audience}`,
    '',
    '活动简介：',
    description,
    '',
    '报名方式：',
    signupNote,
    '',
    '公开链接：',
    officialUrl,
  ].join('\n')
}

function buildWarnings(submission, payload) {
  const warnings = []
  const start = parseDate(submission.startTime)
  const end = parseDate(submission.endTime)

  if (!submission.officialUrl) {
    warnings.push('未提供公开链接，发布前请确认活动确实可公开参与')
  }

  if (!submission.location && !submission.isOnline) {
    warnings.push('线下活动未填写具体地点，当前会用省市兜底')
  }

  if (!submission.endTime) {
    warnings.push('未填写结束时间，前端会按单点开始时间展示')
  }

  if (payload.status === 'ended') {
    warnings.push('该活动时间已过，通常不建议发布到公开活动页')
  }

  if (!start) {
    warnings.push('开始时间格式异常，发布前需人工修正')
  }

  if (submission.endTime && !end) {
    warnings.push('结束时间格式异常，发布前需人工修正')
  }

  if (!submission.organizer) {
    warnings.push('未填写主办方，不建议直接发布')
  }

  return warnings
}

exports.main = async (event) => {
  const submissionId = String(event.submissionId || '').trim()

  if (!submissionId) {
    return { ok: false, message: '缺少 submissionId' }
  }

  try {
    const res = await db.collection('event_submissions').doc(submissionId).get()
    const submission = res.data

    if (!submission) {
      return { ok: false, message: '未找到该活动提交记录' }
    }

    const payload = {
      title: String(submission.title || '').trim(),
      event_type: normalizeEventType(submission.eventType),
      description: buildDescription(submission),
      start_time: String(submission.startTime || '').trim(),
      end_time: String(submission.endTime || '').trim(),
      location: buildLocation(submission),
      fee: String(submission.fee || '').trim() || '免费',
      status: buildEventStatus(submission),
      organizer: String(submission.organizer || '').trim(),
      is_online: !!submission.isOnline,
      contact_info: buildContactInfo(submission),
    }

    const warnings = buildWarnings(submission, payload)

    return {
      ok: true,
      submission: {
        _id: submission._id,
        status: submission.status || 'pending',
        title: submission.title || '',
        province: submission.province || '',
        city: submission.city || '',
        eventType: submission.eventType || '',
        organizer: submission.organizer || '',
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
