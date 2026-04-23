const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COUNT_COLLECTION = 'event_interest_counts'

function createRequestId() {
  return `toggle-interest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
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

async function updateInterestCountAfterMutation(eventId, delta) {
  const countDocId = buildCountDocId(eventId)

  try {
    const currentRes = await db.collection(COUNT_COLLECTION).doc(countDocId).get()
    const currentCount = Number(currentRes.data?.count || 0)
    const nextCount = Math.max(0, currentCount + delta)

    await db.collection(COUNT_COLLECTION).doc(countDocId).set({
      data: {
        eventId,
        count: nextCount,
        updatedAt: db.serverDate(),
      },
    })

    return nextCount
  } catch (err) {
    return syncInterestCount(eventId)
  }
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '缺少活动 ID' }
  }

  const stableDocId = buildInterestDocId(eventId, OPENID)

  try {
    const stableRes = await db.collection('event_interest')
      .where({ _id: stableDocId })
      .limit(1)
      .get()

    let current = stableRes.data[0] || null

    if (!current) {
      const legacyRes = await db.collection('event_interest')
        .where({ eventId, openid: OPENID })
        .limit(20)
        .get()

      const legacyList = legacyRes.data || []
      if (legacyList.length > 0) {
        const preferred = legacyList.find((item) => item.status === 'interested') || legacyList[0]
        const normalizedStatus = preferred.status === 'interested' ? 'interested' : 'cancelled'

        await db.collection('event_interest').doc(stableDocId).set({
          data: {
            eventId,
            openid: OPENID,
            status: normalizedStatus,
            createdAt: preferred.createdAt || db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        await Promise.all(
          legacyList
            .filter((item) => item._id !== stableDocId)
            .map((item) => db.collection('event_interest').doc(item._id).remove().catch(() => null))
        )

        current = {
          _id: stableDocId,
          status: normalizedStatus,
        }
      }
    }

    if (current) {
      const wasInterested = current.status === 'interested'
      const nextStatus = wasInterested ? 'cancelled' : 'interested'
      const delta = wasInterested ? -1 : 1

      await db.collection('event_interest').doc(stableDocId).update({
        data: {
          status: nextStatus,
          updatedAt: db.serverDate(),
        },
      })

      const count = await updateInterestCountAfterMutation(eventId, delta)

      return {
        ok: true,
        code: 'OK',
        requestId,
        hasInterested: nextStatus === 'interested',
        count,
        message: nextStatus === 'interested' ? '已标记为感兴趣' : '已取消感兴趣',
      }
    }

    await db.collection('event_interest').doc(stableDocId).set({
      data: {
        eventId,
        openid: OPENID,
        status: 'interested',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    const count = await updateInterestCountAfterMutation(eventId, 1)

    return {
      ok: true,
      code: 'OK',
      requestId,
      hasInterested: true,
      count,
      message: '已标记为感兴趣',
    }
  } catch (err) {
    console.error('toggleEventInterest error:', err)
    return {
      ok: false,
      code: 'TOGGLE_EVENT_INTEREST_FAILED',
      requestId,
      message: '操作失败，请稍后重试',
    }
  }
}
