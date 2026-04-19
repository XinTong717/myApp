const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const targetUserId = String(event.targetUserId || '').trim()
  const action = String(event.action || '').trim()

  if (!targetUserId || !action) {
    return { ok: false, message: '参数缺失' }
  }

  if (!['block', 'unblock', 'mute', 'unmute'].includes(action)) {
    return { ok: false, message: '无效操作' }
  }

  let target
  try {
    const targetRes = await db.collection('users').doc(targetUserId).get()
    target = targetRes.data
  } catch (err) {
    return { ok: false, message: '找不到该用户' }
  }

  if (!target || !target.openid) {
    return { ok: false, message: '找不到该用户' }
  }

  if (target.openid === OPENID) {
    return { ok: false, message: '不能对自己执行这个操作' }
  }

  const existingRes = await db.collection('safety_relations')
    .where({ ownerOpenid: OPENID, targetOpenid: target.openid })
    .limit(1)
    .get()

  const existing = existingRes.data[0] || null
  const currentBlocked = !!existing?.isBlocked
  const currentMuted = !!existing?.isMuted

  let nextBlocked = currentBlocked
  let nextMuted = currentMuted

  if (action === 'block') nextBlocked = true
  if (action === 'unblock') nextBlocked = false
  if (action === 'mute') nextMuted = true
  if (action === 'unmute') nextMuted = false

  try {
    if (!nextBlocked && !nextMuted) {
      if (existing?._id) {
        await db.collection('safety_relations').doc(existing._id).remove()
      }
      return {
        ok: true,
        message: action === 'unblock' ? '已解除拉黑' : '已取消静音',
        isBlocked: false,
        isMuted: false,
      }
    }

    const data = {
      ownerOpenid: OPENID,
      targetOpenid: target.openid,
      targetUserId,
      targetName: target.displayName || '',
      targetCity: target.city || '',
      isBlocked: nextBlocked,
      isMuted: nextMuted,
      updatedAt: new Date(),
    }

    if (existing?._id) {
      await db.collection('safety_relations').doc(existing._id).update({ data })
    } else {
      await db.collection('safety_relations').add({ data: { ...data, createdAt: new Date() } })
    }

    if (action === 'block') {
      const forwardRes = await db.collection('connections')
        .where({ fromOpenid: OPENID, toOpenid: target.openid, status: _.in(['pending', 'accepted']) })
        .get()
      const backwardRes = await db.collection('connections')
        .where({ fromOpenid: target.openid, toOpenid: OPENID, status: _.in(['pending', 'accepted']) })
        .get()
      const toRemove = [...(forwardRes.data || []), ...(backwardRes.data || [])]
      await Promise.all(
        toRemove.map((conn) => db.collection('connections').doc(conn._id).update({
          data: {
            status: 'removed',
            removedAt: new Date(),
            removedBy: OPENID,
            updatedAt: new Date(),
          },
        }))
      )
    }

    return {
      ok: true,
      message: action === 'block'
        ? '已拉黑该用户'
        : action === 'unblock'
          ? '已解除拉黑'
          : action === 'mute'
            ? '已静音该用户'
            : '已取消静音',
      isBlocked: nextBlocked,
      isMuted: nextMuted,
    }
  } catch (err) {
    console.error('manageSafetyRelation error:', err)
    return { ok: false, message: '操作失败，请稍后重试' }
  }
}
