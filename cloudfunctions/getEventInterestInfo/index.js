const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const COUNT_COLLECTION = 'event_interest_counts'

function createRequestId() {
  return `interest-info-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildInterestDocId(eventId, openid) {
  return `event_${eventId}_${openid}`
}

function buildCountDocId(eventId) {
  return String(eventId)
}

async function syncInterestCount(eventId) {
  const countRes = await db.collection('event_interest')
    .where({
      eventId,
      status: 'interested',
    })
    .count()

  const count = countRes.total || 0

  await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).set({
    data: {
      eventId,
      count,
      updatedAt: db.serverDate(),
    },
  })

  return count
}

async function getCachedCount(eventId) {
  const cacheRes = await db.collection(COUNT_COLLECTION)
    .where({ _id: buildCountDocId(eventId) })
    .limit(1)
    .get()

  if (cacheRes.data.length > 0) {
    return Number(cacheRes.data[0].count || 0)
  }

  return null
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '缺少活动 ID' }
  }

  try {
    const stableDocId = buildInterestDocId(eventId, OPENID)
    const stableRes = await db.collection('event_interest')
      .where({ _id: stableDocId })
      .limit(1)
      .get()

    let hasInterested = false
    if (stableRes.data.length > 0) {
      hasInterested = stableRes.data[0].status === 'interested'
    } else {
      const mineRes = await db.collection('event_interest')
        .where({
          eventId,
          openid: OPENID,
          status: _.in(['interested']),
        })
        .limit(1)
        .get()

      hasInterested = mineRes.data.length > 0
    }

    const cachedCount = await getCachedCount(eventId)
    const count = cachedCount === null ? await syncInterestCount(eventId) : cachedCount

    return {
      ok: true,
      code: 'OK',
      requestId,
      count,
      hasInterested,
    }
  } catch (err) {
    console.error('getEventInterestInfo error:', err)
    return {
      ok: false,
      code: 'GET_EVENT_INTEREST_INFO_FAILED',
      requestId,
      count: 0,
      hasInterested: false,
      message: '读取活动感兴趣信息失败',
    }
  }
}
