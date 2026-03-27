const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { requestId, action } = event

  if (!requestId || !action) {
    return { ok: false, message: '参数缺失' }
  }

  if (action !== 'accept' && action !== 'reject') {
    return { ok: false, message: '无效操作' }
  }

  // 查找这条请求
  let conn
  try {
    const res = await db.collection('connections').doc(requestId).get()
    conn = res.data
  } catch (err) {
    return { ok: false, message: '找不到该请求' }
  }

  // 只有被请求方可以操作
  if (conn.toOpenid !== myOpenid) {
    return { ok: false, message: '无权操作此请求' }
  }

  // 只能操作 pending 的
  if (conn.status !== 'pending') {
    return { ok: false, message: '该请求已处理过了' }
  }

  await db.collection('connections').doc(requestId).update({
    data: {
      status: action === 'accept' ? 'accepted' : 'rejected',
      respondedAt: new Date(),
    },
  })

  return {
    ok: true,
    message: action === 'accept' ? '已同意联络请求' : '已忽略该请求',
  }
}
