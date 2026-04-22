const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const COUNT_COLLECTION = 'event_interest_counts'

function createRequestId() {
  return `interest-counts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildCountDocId(eventId) {
  return String(eventId)
}

async function syncInterestCount(eventId) {
  const res = await db.collection('event_interest')
    .where({
      eventId,
      status: 'interested',
    })
    .count()

  const count = res.total || 0

  await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).set({
    data: {
      eventId,
      count,
      updatedAt: db.serverDate(),
    },
  })

  return count
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const eventIds = Array.isArray(event.eventIds)
    ? event.eventIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []

  if (eventIds.length === 0) {
    return { ok: true, code: 'OK', requestId, counts: {} }
  }

  try {
    const counts = {}
    const countDocIds = eventIds.map((eventId) => buildCountDocId(eventId))
    const cachedRes = await db.collection(COUNT_COLLECTION)
      .where({ _id: _.in(countDocIds) })
      .get()

    const cacheMap = new Map(
      (cachedRes.data || []).map((item) => [String(item._id), Number(item.count || 0)])
    )

    const missingIds = []
    for (const eventId of eventIds) {
      const cacheKey = buildCountDocId(eventId)
      if (cacheMap.has(cacheKey)) {
        counts[eventId] = cacheMap.get(cacheKey) || 0
      } else {
        missingIds.push(eventId)
      }
    }

    if (missingIds.length > 0) {
      await Promise.all(
        missingIds.map(async (eventId) => {
          counts[eventId] = await syncInterestCount(eventId)
        })
      )
    }

    return { ok: true, code: 'OK', requestId, counts }
  } catch (err) {
    console.error('getEventInterestCountsBatch error:', err)
    return {
      ok: false,
      code: 'GET_EVENT_INTEREST_COUNTS_FAILED',
      requestId,
      counts: {},
      message: '读取活动感兴趣人数失败',
    }
  }
}
