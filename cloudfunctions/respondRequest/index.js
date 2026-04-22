const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function createRequestId() {
  return `respond-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const connectionId = String(event.requestId || '').trim()
  const action = String(event.action || '').trim()

  if (!connectionId || !action) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '参数缺失' }
  }

  if (action !== 'accept' && action !== 'reject') {
    return { ok: false, code: 'INVALID_ACTION', requestId, message: '无效操作' }
  }

  let conn
  try {
    const res = await db.collection('connections').doc(connectionId).get()
    conn = res.data
  } catch (err) {
    return { ok: false, code: 'CONNECTION_NOT_FOUND', requestId, message: '找不到该请求' }
  }

  if (conn.toOpenid !== myOpenid) {
    return { ok: false, code: 'FORBIDDEN', requestId, message: '无权操作此请求' }
  }

  if (conn.status !== 'pending') {
    return { ok: false, code: 'REQUEST_ALREADY_PROCESSED', requestId, message: '该请求已处理过了' }
  }

  const nextStatus = action === 'accept' ? 'accepted' : 'rejected'

  await db.collection('connections').doc(connectionId).update({
    data: {
      status: nextStatus,
      respondedAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return {
    ok: true,
    code: 'OK',
    requestId,
    nextStatus,
    message: action === 'accept' ? '已同意联络请求' : '已忽略该请求',
  }
}
