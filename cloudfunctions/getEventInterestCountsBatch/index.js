const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const eventIds = Array.isArray(event.eventIds)
    ? event.eventIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []

  if (eventIds.length === 0) {
    return { ok: true, counts: {} }
  }

  try {
    const res = await db.collection('event_interest')
      .where({
        eventId: _.in(eventIds),
        status: 'interested',
      })
      .field({ eventId: true })
      .limit(1000)
      .get()

    const counts = {}
    for (const eventId of eventIds) counts[eventId] = 0
    for (const item of res.data || []) {
      const eventId = Number(item.eventId)
      if (!counts[eventId]) counts[eventId] = 0
      counts[eventId] += 1
    }

    return { ok: true, counts }
  } catch (err) {
    console.error('getEventInterestCountsBatch error:', err)
    return { ok: false, counts: {}, message: '读取活动感兴趣人数失败' }
  }
}
