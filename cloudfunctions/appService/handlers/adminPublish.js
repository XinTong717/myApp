const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')
const {
  buildBlockingErrors,
  buildEventPayload,
  buildWarnings,
} = require('../lib/eventPublishPayload')

const EVENT_ID_ALLOCATION_MAX_RETRIES = 5
const COUNTERS_COLLECTION = 'counters'
const EVENT_COUNTER_DOC_ID = 'events'

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

async function getCurrentMaxEventId() {
  const res = await db.collection('events')
    .field({ id: true })
    .orderBy('id', 'desc')
    .limit(1)
    .get()
  const maxId = Number((res.data || [])[0]?.id || 0)
  return Number.isFinite(maxId) && maxId > 0 ? maxId : 0
}

async function eventIdExists(eventId) {
  const res = await db.collection('events')
    .where({ id: eventId })
    .field({ id: true })
    .limit(1)
    .get()
  return (res.data || []).length > 0
}

async function ensureEventCounterSeeded() {
  try {
    const existing = await db.collection(COUNTERS_COLLECTION).doc(EVENT_COUNTER_DOC_ID).get()
    if (existing.data) return
  } catch (err) {
    // Missing counter doc is expected before first publish after this migration.
  }

  const maxId = await getCurrentMaxEventId()
  try {
    await db.collection(COUNTERS_COLLECTION).doc(EVENT_COUNTER_DOC_ID).set({
      data: {
        current: maxId,
        name: EVENT_COUNTER_DOC_ID,
        updatedAt: db.serverDate(),
        createdAt: db.serverDate(),
      },
    })
  } catch (err) {
    console.warn('ensureEventCounterSeeded set skipped:', err && err.message ? err.message : err)
  }
}

async function allocateEventIdFromCounter() {
  await ensureEventCounterSeeded()

  for (let i = 0; i < EVENT_ID_ALLOCATION_MAX_RETRIES; i += 1) {
    await db.collection(COUNTERS_COLLECTION).doc(EVENT_COUNTER_DOC_ID).update({
      data: {
        current: _.inc(1),
        updatedAt: db.serverDate(),
      },
    })

    const counterRes = await db.collection(COUNTERS_COLLECTION).doc(EVENT_COUNTER_DOC_ID).get()
    const candidate = Number(counterRes.data?.current || 0)
    if (!Number.isFinite(candidate) || candidate <= 0) continue
    const exists = await eventIdExists(candidate)
    if (!exists) return candidate
  }

  throw new Error('EVENT_COUNTER_COLLISION_RETRIES_EXHAUSTED')
}

async function allocateEventIdLegacyFallback() {
  const maxId = await getCurrentMaxEventId()
  let candidate = maxId + 1

  for (let i = 0; i < EVENT_ID_ALLOCATION_MAX_RETRIES; i += 1) {
    const exists = await eventIdExists(candidate)
    if (!exists) return candidate
    candidate += 1
  }

  const fallback = Date.now()
  console.warn('allocateEventId legacy exhausted sequential retries, using timestamp fallback:', fallback)
  return fallback
}

async function allocateEventId() {
  try {
    return await allocateEventIdFromCounter()
  } catch (err) {
    console.warn('allocateEventId counter path failed, falling back to legacy allocator:', err && err.message ? err.message : err)
    return allocateEventIdLegacyFallback()
  }
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
    const blockingErrors = buildBlockingErrors(submission, payload, { allowSecurityForce: force })
    if (blockingErrors.length > 0) {
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
        forceUsed: force,
        warnings,
        blockingErrors,
        contentSecurityStatus: submission.contentSecurityStatus || '',
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
