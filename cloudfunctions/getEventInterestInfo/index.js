const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, message: '缺少活动 ID' }
  }

  const activeStatuses = ['interested']

  const countRes = await db.collection('event_interest')
    .where({
      eventId,
      status: _.in(activeStatuses),
    })
    .count()

  const mineRes = await db.collection('event_interest')
    .where({
      eventId,
      openid: OPENID,
      status: _.in(activeStatuses),
    })
    .limit(1)
    .get()

  return {
    ok: true,
    count: countRes.total || 0,
    hasInterested: mineRes.data.length > 0,
  }
}
