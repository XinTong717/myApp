const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function createRequestId() {
  return `manage-connection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const connectionId = String(event.connectionId || '').trim()
  const action = String(event.action || '').trim()

  if (!connectionId || !action) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '参数缺失' }
  }

  if (!['withdraw', 'remove_connection'].includes(action)) {
    return { ok: false, code: 'INVALID_ACTION', requestId, message: '无效操作' }
  }

  let conn
  try {
    const res = await db.collection('connections').doc(connectionId).get()
    conn = res.data
  } catch (err) {
    return { ok: false, code: 'CONNECTION_NOT_FOUND', requestId, message: '找不到该连接记录' }
  }

  if (!conn) {
    return { ok: false, code: 'CONNECTION_NOT_FOUND', requestId, message: '找不到该连接记录' }
  }

  if (action === 'withdraw') {
    if (conn.fromOpenid !== OPENID) {
      return { ok: false, code: 'FORBIDDEN', requestId, message: '只有发送方可以撤回请求' }
    }
    if (conn.status !== 'pending') {
      return { ok: false, code: 'INVALID_STATUS', requestId, message: '只能撤回待处理请求' }
    }

    await db.collection('connections').doc(connectionId).update({
      data: {
        status: 'withdrawn',
        withdrawnAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, code: 'OK', requestId, message: '已撤回请求', nextStatus: 'withdrawn' }
  }

  if (conn.status !== 'accepted') {
    return { ok: false, code: 'INVALID_STATUS', requestId, message: '只能删除已建立的连接' }
  }
  if (conn.fromOpenid !== OPENID && conn.toOpenid !== OPENID) {
    return { ok: false, code: 'FORBIDDEN', requestId, message: '无权删除这条连接' }
  }

  await db.collection('connections').doc(connectionId).update({
    data: {
      status: 'removed',
      removedAt: db.serverDate(),
      removedBy: OPENID,
      updatedAt: db.serverDate(),
    },
  })

  return { ok: true, code: 'OK', requestId, message: '已删除连接', nextStatus: 'removed' }
}
