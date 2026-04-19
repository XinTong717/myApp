const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, message: '缺少活动 ID' }
  }

  const existingRes = await db.collection('event_interest')
    .where({ eventId, openid: OPENID })
    .limit(1)
    .get()

  const existing = existingRes.data[0]

  try {
    if (existing) {
      const nextStatus = existing.status === 'interested' ? 'cancelled' : 'interested'
      await db.collection('event_interest').doc(existing._id).update({
        data: {
          status: nextStatus,
          updatedAt: db.serverDate(),
        },
      })
      return {
        ok: true,
        hasInterested: nextStatus === 'interested',
        message: nextStatus === 'interested' ? '已标记为感兴趣' : '已取消感兴趣',
      }
    }

    await db.collection('event_interest').add({
      data: {
        eventId,
        openid: OPENID,
        status: 'interested',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, hasInterested: true, message: '已标记为感兴趣' }
  } catch (err) {
    console.error('toggleEventInterest error:', err)
    return { ok: false, message: '操作失败，请稍后重试' }
  }
}
