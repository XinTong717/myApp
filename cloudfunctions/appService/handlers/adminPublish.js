const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')

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

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function stringifyLabels(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' / ')
  return String(value || '').trim()
}

function firstEventType(submission) {
  const eventTypes = Array.isArray(submission.eventTypes) ? submission.eventTypes.filter(Boolean) : []
  if (eventTypes.length > 0) return eventTypes.find((item) => !String(item).startsWith('其他：')) || eventTypes[0]
  return String(submission.eventType || '').trim()
}

function normalizeEventType(submission) {
  return EVENT_TYPE_MAP[firstEventType(submission)] || 'meetup'
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

function buildDescription(submission) {
  const audienceWho = stringifyLabels(submission.audienceWhoTags || submission.audienceWho) || '未注明'
  const minAge = String(submission.minAgeRequirement || '').trim() || '未注明'
  const eventTypes = stringifyLabels(submission.eventTypes || submission.eventType)
  const description = String(submission.description || '').trim() || '暂无详细介绍'
  const signupNote = String(submission.signupNote || '').trim() || '请查看公开主页或活动说明'
  const officialUrl = String(submission.officialUrl || '').trim() || '未提供'
  return [eventTypes ? `活动类型：${eventTypes}` : '', `参与对象：${audienceWho}`, `最低年龄要求：${minAge}`, '', '活动简介：', description, '', '报名方式补充说明：', signupNote, '', '公开主页或报名链接：', officialUrl].filter(Boolean).join('\n')
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

function buildEventPayload(submission) {
  return {
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
}

function buildBlockingErrors(submission, payload) {
  const errors = []
  const start = parseDate(payload.start_time)
  const end = parseDate(payload.end_time)
  if (!payload.title) errors.push('缺少活动标题')
  if (!payload.organizer) errors.push('缺少组织者')
  if (!start) errors.push('开始时间格式异常')
  if (payload.end_time && !end) errors.push('结束时间格式异常')
  if (start && end && end.getTime() < start.getTime()) errors.push('结束时间早于开始时间')
  if (!String(submission.officialUrl || submission.signupNote || submission.organizerContact || '').trim()) errors.push('缺少公开链接、报名说明或组织者联系方式')
  return errors
}

function buildWarnings(submission, payload) {
  const warnings = []
  if (!submission.location && !submission.isOnline) warnings.push('线下活动未填写具体地点，当前会用省市兜底')
  if (!submission.endTime) warnings.push('未填写结束时间，前端会按单点开始时间展示')
  if (payload.status === 'ended') warnings.push('该活动时间已过，通常不建议发布到公开活动页')
  if (submission.fee === '付费' && !String(submission.feeDetail || '').trim()) warnings.push('该活动标记为付费，但未填写费用说明')
  return warnings
}

async function getEventSubmissionById(submissionId) {
  try {
    const res = await db.collection('event_submissions').doc(submissionId).get()
    return res.data || null
  } catch (err) {
    const message = String(err?.errMsg || err?.message || '')
    if (message.includes('does not exist') || message.includes('document.get:fail')) return null
    throw err
  }
}

async function allocateEventId() {
  try {
    const res = await db.collection('events')
      .field({ id: true })
      .orderBy('id', 'desc')
      .limit(1)
      .get()
    const maxId = Number((res.data || [])[0]?.id || 0)
    if (Number.isFinite(maxId) && maxId > 0) return maxId + 1
  } catch (err) {
    console.warn('allocateEventId max-id lookup failed, using timestamp id:', err && err.message ? err.message : err)
  }
  return Date.now()
}

async function publishEventDirect(event, wxContext) {
  const requestId = resolveRequestId('publish-event-direct', event)
  const submissionId = String(event.submissionId || '').trim()
  const adminNote = String(event.adminNote || '').trim()
  const force = !!event.force
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')
  if (submissionId.includes('填一个')) return fail(requestId, 'SUBMISSION_ID_PLACEHOLDER', '请把 submissionId 替换成 event_submissions 里的真实 _id')

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限发布活动')

    const submission = await getEventSubmissionById(submissionId)
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', `未找到该活动提交记录：${submissionId}`)

    if (submission.status === 'merged' && submission.publishedEventId) {
      return ok(requestId, { message: '该活动已发布，无需重复发布', nextStatus: 'merged', publishedEventId: Number(submission.publishedEventId) })
    }

    const existingPublished = await db.collection('events').where({ source_submission_id: submissionId }).limit(1).get()
    if ((existingPublished.data || []).length > 0) {
      const existing = existingPublished.data[0]
      const existingId = Number(existing.id || existing._id)
      await db.collection('event_submissions').doc(submissionId).update({
        data: {
          status: 'merged',
          publishedEventId: existingId,
          publishedAt: db.serverDate(),
          reviewedAt: db.serverDate(),
          reviewedBy: String(admin.name || '').trim() || 'admin',
          adminNote: adminNote || '已发布到 events',
          updatedAt: db.serverDate(),
        },
      })
      return ok(requestId, { message: '该提交已存在对应活动，已同步审核状态', nextStatus: 'merged', publishedEventId: existingId, event: existing })
    }

    const payload = buildEventPayload(submission)
    const warnings = buildWarnings(submission, payload)
    const blockingErrors = buildBlockingErrors(submission, payload)
    if (blockingErrors.length > 0 && !force) {
      return fail(requestId, 'PUBLISH_BLOCKED', `暂不能发布：${blockingErrors.join('；')}`, { warnings, blockingErrors })
    }

    const publishedEventId = await allocateEventId()
    const eventDoc = {
      ...payload,
      id: publishedEventId,
      source: 'event_submission',
      source_submission_id: submissionId,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
    const reviewerName = String(admin.name || '').trim() || 'admin'

    await db.collection('events').add({ data: eventDoc })
    await db.collection('event_submissions').doc(submissionId).update({
      data: {
        status: 'merged',
        publishedEventId,
        publishedAt: db.serverDate(),
        reviewedAt: db.serverDate(),
        reviewedBy: reviewerName,
        adminNote: adminNote || '已发布到 events',
        updatedAt: db.serverDate(),
      },
    })

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'event_submission_published_directly',
      targetType: 'event_submission',
      targetId: submissionId,
      metadata: {
        title: submission.title || '',
        previousStatus: submission.status || 'pending',
        nextStatus: 'merged',
        publishedEventId,
        warnings,
        blockingErrors,
        adminNote: adminNote || '已发布到 events',
      },
    })

    return ok(requestId, {
      message: '已一键发布到活动库',
      nextStatus: 'merged',
      publishedEventId,
      event: eventDoc,
      warnings,
    })
  } catch (err) {
    console.error('appService publishEventDirect error:', err)
    return fail(requestId, 'PUBLISH_EVENT_DIRECT_FAILED', '一键发布失败，请稍后重试')
  }
}

module.exports = {
  publishEventDirect,
}
