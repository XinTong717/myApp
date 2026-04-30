const { ok, fail, resolveRequestId } = require('./lib/response')
const { cloud } = require('./lib/cloud')
const { rateLimit } = require('./lib/rateLimit')
const publicHandlers = require('./handlers/public')
const userHandlers = require('./handlers/userV2')
const mapUserHandlers = require('./handlers/mapUsers')
const adminHandlers = require('./handlers/admin')

const READ_ACTION_RATE_LIMITS = {
  getMapUsers: { limit: 30, windowMs: 60 * 1000 },
  getMyRequests: { limit: 30, windowMs: 60 * 1000 },
  getEventInterestInfo: { limit: 60, windowMs: 60 * 1000 },
  getEvents: { limit: 60, windowMs: 60 * 1000 },
  getSchools: { limit: 60, windowMs: 60 * 1000 },
}

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
    const limitConfig = READ_ACTION_RATE_LIMITS[action]

    if (limitConfig) {
      const limitRes = await rateLimit(wxContext.OPENID, action, limitConfig)
      if (!limitRes.ok) {
        return fail(requestId, limitRes.code || 'RATE_LIMITED', limitRes.message || '操作过于频繁，请稍后再试')
      }
    }

    return await handler(event, wxContext)
  } catch (err) {
    console.error(`appService ${action} error:`, err)
    return fail(requestId, 'APP_SERVICE_FAILED', '服务处理失败，请稍后重试')
  }
}
