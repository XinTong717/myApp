const { cloud } = require('./cloud')

async function runMsgSecCheck({ content, openid, scene = 2, maxLen = 2500, blockedMessage = '内容包含不合规信息，请修改后重试', failedMessage = '内容审核失败，请稍后重试' }) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return { ok: true }
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, maxLen),
      version: 2,
      scene,
      openid,
    })
    const errCode = res?.errCode ?? res?.errcode ?? 0
    if (errCode === 0) {
      return { ok: true }
    }
    return { ok: false, code: 'CONTENT_SECURITY_BLOCKED', message: blockedMessage }
  } catch (err) {
    console.error('runMsgSecCheck error:', err)
    return { ok: false, code: 'CONTENT_SECURITY_FAILED', message: failedMessage }
  }
}

module.exports = {
  runMsgSecCheck,
}
