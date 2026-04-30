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

function firstEventType(submission) {
  const eventTypes = Array.isArray(submission.eventTypes) ? submission.eventTypes.filter(Boolean) : []
  if (eventTypes.length > 0) return eventTypes.find((item) => !String(item).startsWith('其他：')) || eventTypes[0]
  return String(submission.eventType || '').trim()
}

function normalizeEventType(submission) {
  return EVENT_TYPE_MAP[firstEventType(submission)] || 'meetup'
}

function stringifyLabels(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' / ')
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
  const lines = []
  if (officialUrl) lines.push(`公开主页或报名链接：${officialUrl}`)
  if (signupNote) lines.push(`报名方式补充说明：${signupNote}`)
  return lines.length > 0 ? lines.join('\n') : '请等待更多公开信息'
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

async function checkAdminAccess(event, wxContext) {
  const requestId = resolveRequestId('check-admin-access', event)
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    return ok(requestId, { isAdmin: !!admin, admin: admin ? { name: admin.name || '', role: admin.role || 'admin' } : null })
  } catch (err) {
    console.error('appService checkAdminAccess error:', err)
    return fail(requestId, 'CHECK_ADMIN_ACCESS_FAILED', '管理员权限检查失败，请确认 admin_users 集合已创建', { isAdmin: false, admin: null })
  }
}

async function listEventSubmissions(event, wxContext) {
  const requestId = resolveRequestId('list-event-submissions', event)
  const status = String(event.status || 'pending').trim()
  const limit = Math.min(Math.max(Number(event.limit || 30), 1), 100)
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限访问管理员审核列表')
    let query = db.collection('event_submissions')
    if (status && status !== 'all') query = query.where({ status })
    const res = await query.orderBy('createdAt', 'desc').limit(limit).get()
    const submissions = (res.data || []).map((item) => ({
      _id: item._id,
      status: item.status || 'pending',
      title: item.title || '',
      province: item.province || '',
      city: item.city || '',
      eventType: item.eventType || '',
      organizer: item.organizer || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      isOnline: !!item.isOnline,
      fee: item.fee || '',
      officialUrl: item.officialUrl || '',
      descriptionPreview: String(item.description || '').trim().slice(0, 100),
      submitterDisplayName: item.submitterDisplayName || '',
      submitterCity: item.submitterCity || '',
      createdAt: item.createdAt || null,
      publishedEventId: item.publishedEventId || null,
      adminNote: item.adminNote || '',
    }))
    return ok(requestId, { submissions, admin: { name: admin.name || '', role: admin.role || 'admin' } })
  } catch (err) {
    console.error('appService listEventSubmissions error:', err)
    return fail(requestId, 'LIST_EVENT_SUBMISSIONS_FAILED', '读取活动审核列表失败，请确认 admin_users / event_submissions 配置正常')
  }
}

async function getEventPublishPayload(event, wxContext) {
  const requestId = resolveRequestId('get-event-publish-payload', event)
  const submissionId = String(event.submissionId || '').trim()
  if (!submissionId) return fail(requestId, 'BAD_REQUEST', '缺少 submissionId')
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限访问管理员发布辅助工具')
    const res = await db.collection('event_submissions').doc(submissionId).get()
    const submission = res.data
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', '未找到该活动提交记录')
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
    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'event_submission_publish_payload_viewed',
      targetType: 'event_submission',
      targetId: submissionId,
      metadata: {
        title: submission.title || '',
        currentStatus: submission.status || 'pending',
        warnings,
      },
    })
    return ok(requestId, {
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
      suggestedReviewUpdate: { status: 'merged', publishedEventId: null, adminNote: '已发布到 events' },
      warnings,
    })
  } catch (err) {
    console.error('appService getEventPublishPayload error:', err)
    return fail(requestId, 'GET_EVENT_PUBLISH_PAYLOAD_FAILED', '读取提交记录失败，请稍后重试')
  }
}

async function reviewEventSubmission(event, wxContext) {
  const requestId = resolveRequestId('review-event-submission', event)
  const submissionId = String(event.submissionId || '').trim()
  const action = String(event.action || '').trim()
  const publishedEventIdRaw = event.publishedEventId
  const adminNote = String(event.adminNote || '').trim()
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')
  if (!['mark_published', 'reject', 'reset_pending'].includes(action)) return fail(requestId, 'INVALID_ACTION', '不支持的 action')
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限修改活动审核状态')
    const docRes = await db.collection('event_submissions').doc(submissionId).get()
    const submission = docRes.data
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', '未找到该活动提交记录')
    const reviewerName = String(admin.name || '').trim() || 'admin'
    if (action === 'mark_published') {
      const publishedEventId = Number(publishedEventIdRaw || 0)
      if (!publishedEventId) return fail(requestId, 'PUBLISHED_EVENT_ID_REQUIRED', 'mark_published 需要有效的 publishedEventId')
      await db.collection('event_submissions').doc(submissionId).update({ data: { status: 'merged', publishedEventId, publishedAt: db.serverDate(), reviewedAt: db.serverDate(), reviewedBy: reviewerName, adminNote: adminNote || '已发布到 events', updatedAt: db.serverDate() } })
      await writeAdminAuditLog({
        admin,
        openid: wxContext.OPENID,
        action: 'event_submission_mark_published',
        targetType: 'event_submission',
        targetId: submissionId,
        metadata: {
          title: submission.title || '',
          previousStatus: submission.status || 'pending',
          nextStatus: 'merged',
          publishedEventId,
          adminNote: adminNote || '已发布到 events',
        },
      })
      return ok(requestId, { message: '已标记为已发布', nextStatus: 'merged', publishedEventId })
    }
    if (action === 'reject') {
      await db.collection('event_submissions').doc(submissionId).update({ data: { status: 'rejected', reviewedAt: db.serverDate(), reviewedBy: reviewerName, adminNote: adminNote || '未通过审核', updatedAt: db.serverDate() } })
      await writeAdminAuditLog({
        admin,
        openid: wxContext.OPENID,
        action: 'event_submission_rejected',
        targetType: 'event_submission',
        targetId: submissionId,
        metadata: {
          title: submission.title || '',
          previousStatus: submission.status || 'pending',
          nextStatus: 'rejected',
          adminNote: adminNote || '未通过审核',
        },
      })
      return ok(requestId, { message: '已标记为拒绝', nextStatus: 'rejected' })
    }
    await db.collection('event_submissions').doc(submissionId).update({ data: { status: 'pending', publishedEventId: db.command.remove(), publishedAt: db.command.remove(), reviewedAt: db.serverDate(), reviewedBy: reviewerName, adminNote: adminNote || '已重置为待审核', updatedAt: db.serverDate() } })
    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'event_submission_reset_pending',
      targetType: 'event_submission',
      targetId: submissionId,
      metadata: {
        title: submission.title || '',
        previousStatus: submission.status || 'pending',
        nextStatus: 'pending',
        adminNote: adminNote || '已重置为待审核',
      },
    })
    return ok(requestId, { message: '已重置为待审核', nextStatus: 'pending' })
  } catch (err) {
    console.error('appService reviewEventSubmission error:', err)
    return fail(requestId, 'REVIEW_EVENT_SUBMISSION_FAILED', '更新审核状态失败，请稍后重试')
  }
}

module.exports = {
  checkAdminAccess,
  listEventSubmissions,
  getEventPublishPayload,
  reviewEventSubmission,
}
