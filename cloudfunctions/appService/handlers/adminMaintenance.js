const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')
const { RATE_LIMIT_COLLECTION } = require('../lib/rateLimit')

const EVENT_INTEREST_COLLECTION = 'event_interest'
const EVENT_INTEREST_COUNT_COLLECTION = 'event_interest_counts'
const MAX_RECONCILE_EVENTS = 100
const DEFAULT_RECONCILE_EVENTS = 50
const MAX_CLEANUP_BATCH = 1000
const DEFAULT_CLEANUP_BATCH = 300
const DEFAULT_RATE_LIMIT_RETENTION_DAYS = 7

function normalizePositiveInt(value, fallback, max) {
  const n = Number(value || fallback)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}

function normalizeEventIds(value) {
  const list = Array.isArray(value) ? value : []
  return Array.from(new Set(
    list
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  )).slice(0, MAX_RECONCILE_EVENTS)
}

async function listEventIds(limit) {
  const res = await db.collection('events')
    .field({ id: true })
    .orderBy('id', 'asc')
    .limit(limit)
    .get()

  return (res.data || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

async function writeInterestCount(eventId, count) {
  await db.collection(EVENT_INTEREST_COUNT_COLLECTION).doc(String(eventId)).set({
    data: {
      eventId,
      count: Math.max(0, Number(count || 0)),
      reconciledAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
}

async function reconcileEventInterestCounts(event, wxContext) {
  const requestId = resolveRequestId('reconcile-event-interest-counts', event)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限校准活动感兴趣计数')

    const requestedIds = normalizeEventIds(event.eventIds)
    const limit = normalizePositiveInt(event.limit, DEFAULT_RECONCILE_EVENTS, MAX_RECONCILE_EVENTS)
    const eventIds = requestedIds.length > 0 ? requestedIds : await listEventIds(limit)

    const results = []
    for (const eventId of eventIds) {
      const countRes = await db.collection(EVENT_INTEREST_COLLECTION)
        .where({ eventId, status: 'interested' })
        .count()
      const count = Number(countRes?.total || 0)
      await writeInterestCount(eventId, count)
      results.push({ eventId, count })
    }

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'event_interest_counts_reconciled',
      targetType: 'event_interest_counts',
      targetId: 'batch',
      metadata: {
        eventCount: results.length,
        requestedEventIds: requestedIds,
        limit,
      },
    })

    return ok(requestId, {
      message: `已校准 ${results.length} 个活动的感兴趣计数`,
      reconciled: results,
      eventCount: results.length,
    })
  } catch (err) {
    console.error('appService reconcileEventInterestCounts error:', err)
    return fail(requestId, 'RECONCILE_EVENT_INTEREST_COUNTS_FAILED', '校准活动感兴趣计数失败，请稍后重试')
  }
}

async function cleanupRateLimits(event, wxContext) {
  const requestId = resolveRequestId('cleanup-rate-limits', event)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限清理限流记录')

    const retentionDays = normalizePositiveInt(event.retentionDays, DEFAULT_RATE_LIMIT_RETENTION_DAYS, 30)
    const limit = normalizePositiveInt(event.limit, DEFAULT_CLEANUP_BATCH, MAX_CLEANUP_BATCH)
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    const res = await db.collection(RATE_LIMIT_COLLECTION)
      .where({ updatedAt: _.lt(cutoff) })
      .field({ _id: true, action: true, updatedAt: true })
      .limit(limit)
      .get()

    const staleDocs = res.data || []
    await Promise.all(staleDocs.map((item) => db.collection(RATE_LIMIT_COLLECTION).doc(item._id).remove().catch((err) => {
      console.warn('cleanupRateLimits remove skipped:', item._id, err && err.message ? err.message : err)
    })))

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'rate_limits_cleaned_up',
      targetType: RATE_LIMIT_COLLECTION,
      targetId: 'batch',
      metadata: {
        removedCount: staleDocs.length,
        retentionDays,
        limit,
        cutoff: cutoff.toISOString(),
      },
    })

    return ok(requestId, {
      message: `已清理 ${staleDocs.length} 条旧限流记录`,
      removedCount: staleDocs.length,
      retentionDays,
      cutoff: cutoff.toISOString(),
      hasMore: staleDocs.length === limit,
    })
  } catch (err) {
    console.error('appService cleanupRateLimits error:', err)
    return fail(requestId, 'CLEANUP_RATE_LIMITS_FAILED', '清理限流记录失败，请稍后重试')
  }
}

module.exports = {
  reconcileEventInterestCounts,
  cleanupRateLimits,
}
