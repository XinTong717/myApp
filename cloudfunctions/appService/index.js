const { ok, fail, resolveRequestId } = require('./lib/response')
const { cloud } = require('./lib/cloud')
const publicHandlers = require('./handlers/public')
const userHandlers = require('./handlers/userV2')
const mapUserHandlers = require('./handlers/mapUsers')
const adminHandlers = require('./handlers/admin')

async function getOpenId(event, wxContext) {
  const requestId = resolveRequestId('get-openid', event)
  return ok(requestId, {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
  })
}

const actionHandlers = {
  getOpenId,
  ...publicHandlers,
  ...userHandlers,
  ...mapUserHandlers,
  ...adminHandlers,
}

exports.main = async (event = {}) => {
  const action = String(event.action || '').trim()
  const requestId = resolveRequestId('app-service', event)

  if (!action) {
    return fail(requestId, 'ACTION_REQUIRED', '缺少 action 参数')
  }

  const handler = actionHandlers[action]
  if (!handler) {
    return fail(requestId, 'UNKNOWN_ACTION', `未知 action: ${action}`)
  }

  try {
    const wxContext = cloud.getWXContext()
    return await handler(event, wxContext)
  } catch (err) {
    console.error(`appService ${action} error:`, err)
    return fail(requestId, 'APP_SERVICE_FAILED', '服务处理失败，请稍后重试')
  }
}
