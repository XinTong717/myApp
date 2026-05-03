const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { runMsgSecCheck } = require('../lib/security')
const {
  listSchools,
  listSchoolMarkers,
  getSchoolById,
  listEvents,
  getEventById,
} = require('../lib/contentRepo')
const {
  normalizeStringArray,
  mergeOtherOption,
  stringifyLabels,
  validateLength,
} = require('../lib/normalize')
const { getUserProfileByOpenid } = require('../lib/userRepo')

const COUNT_COLLECTION = 'event_interest_counts'
const DAILY_SUBMISSION_LIMIT = 5

function buildInterestDocId(eventId, openid) {
  return `event_${eventId}_${openid}`
}

function buildCountDocId(eventId) {
  return String(eventId)
}

function buildContentSecurityFields(sec = {}) {
  return {
    contentSecurityStatus: sec.contentSecurityStatus || 'unknown',
    contentSecuritySuggest: sec.contentSecuritySuggest || '',
    contentSecurityLabel: sec.contentSecurityLabel || '',
    contentSecurityErrorCode: sec.contentSecurityErrorCode || 0,
    contentSecurityError: sec.contentSecurityError || '',
  }
}

async function getCachedCount(eventId) {
  try {
    const cacheRes = await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).get()
    return Number(cacheRes.data?.count || 0)
  } catch (err) {
    return null
  }
}

async function adjustInterestCountCache(eventId, delta) {
  const safeDelta = Number(delta || 0)
  const docId = buildCountDocId(eventId)

  if (!safeDelta) return

  try {
    await db.collection(COUNT_COLLECTION).doc(docId).update({
      data: {
        eventId,
        count: _.inc(safeDelta),
        updatedAt: db.serverDate(),
      },
    })
  } catch (err) {
    try {
      await db.collection(COUNT_COLLECTION).doc(docId).set({
        data: { eventId, count: 0, updatedAt: db.serverDate(), createdAt: db.serverDate() },
      })
      await db.collection(COUNT_COLLECTION).doc(docId).update({
        data: {
          eventId,
          count: _.inc(safeDelta),
          updatedAt: db.serverDate(),
        },
      })
    } catch (initErr) {
      console.warn('event interest count initialize+inc degraded:', initErr)
    }
  }
}

async function getCachedCounts(eventIds) {
  const counts = {}
  const countDocIds = eventIds.map((eventId) => buildCountDocId(eventId))

  if (countDocIds.length > 0) {
    try {
      const cachedRes = await db.collection(COUNT_COLLECTION).where({ _id: _.in(countDocIds) }).get()
      for (const item of cachedRes.data || []) {
        counts[Number(item.eventId || item._id)] = Number(item.count || 0)
      }
    } catch (err) {
      console.warn('event interest count cache read skipped:', err)
    }
  }

  for (const eventId of eventIds) {
    if (!Object.prototype.hasOwnProperty.call(counts, eventId)) {
      counts[eventId] = 0
    }
  }

  return counts
}

function attachInterestCounts(events, counts = {}) {
  return events.map((item) => ({
    ...item,
    interest_count: counts[Number(item.id)] || 0,
  }))
}

async function updateInterestCountAfterMutation(eventId, delta) {
  await adjustInterestCountCache(eventId, delta)
}

async function getSchools(event) {
  const requestId = resolveRequestId('get-schools', event)
  try {
    const schools = await listSchools({
      limit: event?.limit,
      province: event?.province,
      provinces: event?.provinces,
      city: event?.city,
      cities: event?.cities,
      schoolType: event?.schoolType || event?.type,
      schoolTypes: event?.schoolTypes || event?.types,
      ageRange: event?.ageRange,
      ageRanges: event?.ageRanges,
    })
    return ok(requestId, { schools })
  } catch (err) {
    console.error('appService getSchools error:', err)
    return fail(requestId, 'GET_SCHOOLS_FAILED', '读取学习社区失败，请稍后重试', { schools: [] })
  }
}

async function getSchoolMarkers(event) {
  const requestId = resolveRequestId('get-school-markers', event)
  try {
    const schools = await listSchoolMarkers({
      limit: event?.limit,
      province: event?.province,
      provinces: event?.provinces,
      city: event?.city,
      cities: event?.cities,
      schoolType: event?.schoolType || event?.type,
      schoolTypes: event?.schoolTypes || event?.types,
      ageRange: event?.ageRange,
      ageRanges: event?.ageRanges,
    })
    return ok(requestId, { schools })
  } catch (err) {
    console.error('appService getSchoolMarkers error:', err)
    return fail(requestId, 'GET_SCHOOL_MARKERS_FAILED', '读取学习社区标记失败，请稍后重试', { schools: [] })
  }
}

async function getSchoolDetail(event) {
  const requestId = resolveRequestId('get-school-detail', event)
  try {
    const schoolId = Number(event?.schoolId || 0)
    if (!schoolId) return fail(requestId, 'BAD_REQUEST', 'schoolId 无效', { school: null })

    const school = await getSchoolById(schoolId)
    return ok(requestId, { school })
  } catch (err) {
    console.error('appService getSchoolDetail error:', err)
    return fail(requestId, 'GET_SCHOOL_DETAIL_FAILED', '读取学习社区详情失败，请稍后重试', { school: null })
  }
}

async function getEvents(event) {
  const requestId = resolveRequestId('get-events', event)
  try {
    const events = await listEvents({ limit: event?.limit, includeEnded: event?.includeEnded === true })
    if (event?.includeInterestCounts === false || events.length === 0) {
      return ok(requestId, { events })
    }

    const eventIds = events.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0)
    const counts = await getCachedCounts(eventIds)
    return ok(requestId, { events: attachInterestCounts(events, counts) })
  } catch (err) {
    console.error('appService getEvents error:', err)
    return fail(requestId, 'GET_EVENTS_FAILED', '读取活动失败，请稍后重试', { events: [] })
  }
}

// rest of file unchanged
module.exports = require('./public')
