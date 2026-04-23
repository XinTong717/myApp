const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function createRequestId() {
  return `get-openid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)

  try {
    const wxContext = cloud.getWXContext()
    return {
      ok: true,
      code: 'OK',
      requestId,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
    }
  } catch (err) {
    console.error('getOpenId error:', err)
    return {
      ok: false,
      code: 'GET_OPENID_FAILED',
      requestId,
      message: '读取身份信息失败，请稍后重试',
    }
  }
}
