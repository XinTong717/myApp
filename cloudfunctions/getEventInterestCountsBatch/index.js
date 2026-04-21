const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const eventIds = Array.isArray(event.eventIds)
    ? event.eventIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []

  if (eventIds.length === 0) {
    return { ok: true, counts: {} }
  }

  try {
    const counts = {}

    await Promise.all(
      eventIds.map(async (eventId) => {
        const res = await db.collection('event_interest')
          .where({
            eventId,
            status: 'interested',
          })
          .count()
        counts[eventId] = res.total || 0
      })
    )

    return { ok: true, counts }
  } catch (err) {
    console.error('getEventInterestCountsBatch error:', err)
    return { ok: false, counts: {}, message: '读取活动感兴趣人数失败' }
  }
}
