const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')
const {
  buildEventPayload,
  buildWarnings,
  normalizeEventType,
  stringifyLabels,
} = require('../lib/eventPublishPayload')

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeLabelArray(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map(normalizeString).filter(Boolean)))
}

function getSchoolTypeText(submission) {
  return normalizeString(submission.schoolType) || stringifyLabels(submission.schoolTypes || [])
}

function getAgeRangeText(submission) {
  return normalizeString(submission.ageRange) || stringifyLabels(submission.ageRanges || [])
}

function buildSchoolPublishPayload(submission) {
  const name = normalizeString(submission.name)
  const schoolPayload = {
    name,
    canonical_name: name,
    school_type: getSchoolTypeText(submission),
    boarding_type: normalizeString(submission.boardingType) || '待确认',
    age_range: getAgeRangeText(submission),
    official_url: normalizeString(submission.officialUrl || submission.publicAccountNote),
    xuji_note: normalizeString(submission.xujiNote),
    residency_req: normalizeString(submission.residencyReq),
    admission_req: normalizeString(submission.admissionReq || submission.participationNote),
    fee: normalizeString(submission.feeNote),
    output_direction: normalizeString(submission.outputDirection),
    status: 'published',
  }
  const locationPayload = {
    province: normalizeString(submission.province),
    city: normalizeString(submission.city),
    address_note: '',
    contact_note: '',
    status: 'published',
    source: 'school_submission',
  }
  const auditOnly = {
    sourceNote: normalizeString(submission.sourceNote),
    recommendationNote: normalizeString(submission.recommendationNote),
    submitterDisplayName: normalizeString(submission.submitterDisplayName),
    submitterCity: normalizeString(submission.submitterCity),
    contentSecurityStatus: normalizeString(submission.contentSecurityStatus || 'unknown'),
  }
  const warnings = []
  if (!schoolPayload.name) warnings.push('缺少学习社区名称')
  if (!locationPayload.province || !locationPayload.city) warnings.push('缺少地点信息')
  if (!schoolPayload.official_url) warnings.push('缺少官方/说明链接，发布前建议补充可核验来源')
  if (!schoolPayload.xuji_note && !schoolPayload.residency_req && !schoolPayload.admission_req) warnings.push('公开详情字段较少，发布前建议补充学籍/资质说明或参与方式')

  return { schoolPayload, locationPayload, auditOnly, warnings }
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
      contentSecurityStatus: item.contentSecurityStatus || '',
    }))
    return ok(requestId, { submissions, admin: { name: admin.name || '', role: admin.role || 'admin' } })
  } catch (err) {
    console.error('appService listEventSubmissions error:', err)
    return fail(requestId, 'LIST_EVENT_SUBMISSIONS_FAILED', '读取活动审核列表失败，请确认 admin_users / event_submissions 配置正常')
  }
}

async function listSchoolSubmissions(event, wxContext) {
  const requestId = resolveRequestId('list-school-submissions', event)
  const status = String(event.status || 'pending').trim()
  const limit = Math.min(Math.max(Number(event.limit || 30), 1), 100)
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限访问学习社区推荐审核列表')
    let query = db.collection('school_submissions')
    if (status && status !== 'all') query = query.where({ status })
    const res = await query.orderBy('createdAt', 'desc').limit(limit).get()
    const submissions = (res.data || []).map((item) => ({
      _id: item._id,
      status: item.status || 'pending',
      name: item.name || '',
      province: item.province || '',
      city: item.city || '',
      schoolType: item.schoolType || stringifyLabels(item.schoolTypes || []),
      schoolTypes: item.schoolTypes || [],
      boardingType: item.boardingType || '待确认',
      ageRange: item.ageRange || stringifyLabels(item.ageRanges || []),
      ageRanges: item.ageRanges || [],
      officialUrl: item.officialUrl || item.publicAccountNote || '',
      publicAccountNote: item.publicAccountNote || '',
      xujiNote: item.xujiNote || '',
      residencyReq: item.residencyReq || '',
      admissionReq: item.admissionReq || item.participationNote || '',
      participationNote: item.participationNote || '',
      feeNote: item.feeNote || '',
      outputDirection: item.outputDirection || '',
      sourceNote: item.sourceNote || '',
      recommendationNote: item.recommendationNote || '',
      submitterDisplayName: item.submitterDisplayName || '',
      submitterCity: item.submitterCity || '',
      createdAt: item.createdAt || null,
      reviewedAt: item.reviewedAt || null,
      reviewedBy: item.reviewedBy || '',
      adminNote: item.adminNote || '',
      contentSecurityStatus: item.contentSecurityStatus || '',
    }))
    return ok(requestId, { submissions, admin: { name: admin.name || '', role: admin.role || 'admin' } })
  } catch (err) {
    console.error('appService listSchoolSubmissions error:', err)
    return fail(requestId, 'LIST_SCHOOL_SUBMISSIONS_FAILED', '读取学习社区推荐失败，请确认 admin_users / school_submissions 配置正常')
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

    const payload = buildEventPayload(submission)
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
        normalizedEventType: normalizeEventType(submission),
        audienceWho: stringifyLabels(submission.audienceWhoTags || submission.audienceWho),
        minAgeRequirement: submission.minAgeRequirement || '',
        organizer: submission.organizer || '',
        organizerContact: submission.organizerContact || '',
        startTime: submission.startTime || '',
        endTime: submission.endTime || '',
        officialUrl: submission.officialUrl || '',
        contentSecurityStatus: submission.contentSecurityStatus || '',
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

async function getSchoolPublishPayload(event, wxContext) {
  const requestId = resolveRequestId('get-school-publish-payload', event)
  const submissionId = String(event.submissionId || '').trim()
  if (!submissionId) return fail(requestId, 'BAD_REQUEST', '缺少 submissionId')
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限访问管理员发布辅助工具')
    const res = await db.collection('school_submissions').doc(submissionId).get()
    const submission = res.data
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', '未找到该学习社区推荐记录')
    const payload = buildSchoolPublishPayload(submission)

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'school_submission_publish_payload_viewed',
      targetType: 'school_submission',
      targetId: submissionId,
      metadata: {
        name: submission.name || '',
        currentStatus: submission.status || 'pending',
        warnings: payload.warnings,
      },
    })

    return ok(requestId, {
      admin: { name: admin.name || '', role: admin.role || 'admin' },
      submissionId,
      ...payload,
    })
  } catch (err) {
    console.error('appService getSchoolPublishPayload error:', err)
    return fail(requestId, 'GET_SCHOOL_PUBLISH_PAYLOAD_FAILED', '读取学习社区发布建议失败，请稍后重试')
  }
}

async function reviewEventSubmission(event, wxContext) {
  const requestId = resolveRequestId('review-event-submission', event)
  const submissionId = String(event.submissionId || '').trim()
  const reviewAction = String(event.reviewAction || '').trim()
  const publishedEventIdRaw = event.publishedEventId
  const adminNote = String(event.adminNote || '').trim()
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')
  if (!['mark_published', 'reject', 'reset_pending'].includes(reviewAction)) return fail(requestId, 'INVALID_ACTION', '不支持的 action')
  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限修改活动审核状态')
    const docRes = await db.collection('event_submissions').doc(submissionId).get()
    const submission = docRes.data
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', '未找到该活动提交记录')
    const reviewerName = String(admin.name || '').trim() || 'admin'
    if (reviewAction === 'mark_published') {
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
    if (reviewAction === 'reject') {
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

async function reviewSchoolSubmission(event, wxContext) {
  const requestId = resolveRequestId('review-school-submission', event)
  const submissionId = String(event.submissionId || '').trim()
  const reviewAction = String(event.reviewAction || '').trim()
  const adminNote = String(event.adminNote || '').trim()
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')
  if (!['mark_processed', 'reject', 'duplicate', 'reset_pending'].includes(reviewAction)) return fail(requestId, 'INVALID_ACTION', '不支持的 action')

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限修改学习社区推荐状态')
    const docRes = await db.collection('school_submissions').doc(submissionId).get()
    const submission = docRes.data
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', '未找到该学习社区推荐记录')

    const reviewerName = String(admin.name || '').trim() || 'admin'
    const nextStatusMap = {
      mark_processed: 'processed',
      reject: 'rejected',
      duplicate: 'duplicate',
      reset_pending: 'pending',
    }
    const nextStatus = nextStatusMap[reviewAction]
    const defaultNoteMap = {
      mark_processed: '已人工处理并录入或合并',
      reject: '未通过审核',
      duplicate: '重复推荐',
      reset_pending: '已重置为待审核',
    }

    await db.collection('school_submissions').doc(submissionId).update({
      data: {
        status: nextStatus,
        reviewedAt: db.serverDate(),
        reviewedBy: reviewerName,
        adminNote: adminNote || defaultNoteMap[reviewAction],
        updatedAt: db.serverDate(),
      },
    })

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: `school_submission_${reviewAction}`,
      targetType: 'school_submission',
      targetId: submissionId,
      metadata: {
        name: submission.name || '',
        province: submission.province || '',
        city: submission.city || '',
        previousStatus: submission.status || 'pending',
        nextStatus,
        adminNote: adminNote || defaultNoteMap[reviewAction],
      },
    })

    return ok(requestId, { message: defaultNoteMap[reviewAction], nextStatus })
  } catch (err) {
    console.error('appService reviewSchoolSubmission error:', err)
    return fail(requestId, 'REVIEW_SCHOOL_SUBMISSION_FAILED', '更新学习社区推荐状态失败，请稍后重试')
  }
}

module.exports = {
  checkAdminAccess,
  listEventSubmissions,
  listSchoolSubmissions,
  getEventPublishPayload,
  getSchoolPublishPayload,
  reviewEventSubmission,
  reviewSchoolSubmission,
}
