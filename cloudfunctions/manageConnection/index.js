const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const connectionId = String(event.connectionId || '').trim()
  const action = String(event.action || '').trim()

  if (!connectionId || !action) {
    return { ok: false, message: '参数缺失' }
  }

  if (!['withdraw', 'remove_connection'].includes(action)) {
    return { ok: false, message: '无效操作' }
  }

  let conn
  try {
    const res = await db.collection('connections').doc(connectionId).get()
    conn = res.data
  } catch (err) {
    return { ok: false, message: '找不到该连接记录' }
  }

  if (!conn) {
    return { ok: false, message: '找不到该连接记录' }
  }

  if (action === 'withdraw') {
    if (conn.fromOpenid !== OPENID) {
      return { ok: false, message: '只有发送方可以撤回请求' }
    }
    if (conn.status !== 'pending') {
      return { ok: false, message: '只能撤回待处理请求' }
    }

    await db.collection('connections').doc(connectionId).update({
      data: {
        status: 'withdrawn',
        withdrawnAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return { ok: true, message: '已撤回请求', nextStatus: 'withdrawn' }
  }

  if (conn.status !== 'accepted') {
    return { ok: false, message: '只能删除已建立的连接' }
  }
  if (conn.fromOpenid !== OPENID && conn.toOpenid !== OPENID) {
    return { ok: false, message: '无权删除这条连接' }
  }

  await db.collection('connections').doc(connectionId).update({
    data: {
      status: 'removed',
      removedAt: new Date(),
      removedBy: OPENID,
      updatedAt: new Date(),
    },
  })

  return { ok: true, message: '已删除连接', nextStatus: 'removed' }
}
