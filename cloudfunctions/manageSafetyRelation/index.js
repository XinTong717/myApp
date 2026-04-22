const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function createRequestId() {
  return `manage-safety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildSafetyDocId(ownerOpenid, targetOpenid) {
  return `safety_${ownerOpenid}_${targetOpenid}`
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const targetUserId = String(event.targetUserId || '').trim()
  const action = String(event.action || '').trim()

  if (!targetUserId || !action) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '参数缺失' }
  }

  if (!['block', 'unblock', 'mute', 'unmute'].includes(action)) {
    return { ok: false, code: 'INVALID_ACTION', requestId, message: '无效操作' }
  }

  let target
  try {
    const targetRes = await db.collection('users').doc(targetUserId).get()
    target = targetRes.data
  } catch (err) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (!target || !target.openid) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (target.openid === OPENID) {
    return { ok: false, code: 'SELF_ACTION_NOT_ALLOWED', requestId, message: '不能对自己执行这个操作' }
  }

  const stableDocId = buildSafetyDocId(OPENID, target.openid)

  let existing = null
  try {
    const stableRes = await db.collection('safety_relations').doc(stableDocId).get()
    existing = stableRes.data || null
  } catch (err) {
    existing = null
  }

  let legacyDocs = []
  if (!existing) {
    const existingRes = await db.collection('safety_relations')
      .where({ ownerOpenid: OPENID, targetOpenid: target.openid })
      .limit(20)
      .get()

    legacyDocs = existingRes.data || []
    existing = legacyDocs.find((item) => item._id === stableDocId) || legacyDocs[0] || null
  }

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
        await db.collection('safety_relations').doc(existing._id).remove().catch(() => null)
      }
      await Promise.all(
        legacyDocs
          .filter((item) => item._id !== existing?._id)
          .map((item) => db.collection('safety_relations').doc(item._id).remove().catch(() => null))
      )

      return {
        ok: true,
        code: 'OK',
        requestId,
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
      updatedAt: db.serverDate(),
    }

    await db.collection('safety_relations').doc(stableDocId).set({
      data: {
        ...data,
        createdAt: existing?.createdAt || db.serverDate(),
      },
    })

    await Promise.all(
      legacyDocs
        .filter((item) => item._id !== stableDocId)
        .map((item) => db.collection('safety_relations').doc(item._id).remove().catch(() => null))
    )

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
            removedAt: db.serverDate(),
            removedBy: OPENID,
            updatedAt: db.serverDate(),
          },
        }).catch(() => null))
      )
    }

    return {
      ok: true,
      code: 'OK',
      requestId,
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
    return { ok: false, code: 'MANAGE_SAFETY_FAILED', requestId, message: '操作失败，请稍后重试' }
  }
}
