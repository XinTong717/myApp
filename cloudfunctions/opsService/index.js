const { cloud } = require('../appService/lib/cloud')
const { fail, resolveRequestId } = require('../appService/lib/response')
const { rateLimit } = require('../appService/lib/rateLimit')
const { ADMIN_ACTION_RATE_LIMITS } = require('../appService/lib/rateLimits.config')
const adminMaintenanceHandlers = require('../appService/handlers/adminMaintenance')
const schoolMigrationHandlers = require('../appService/handlers/schoolMigration')

const ACTION_HANDLERS = {
  ...adminMaintenanceHandlers,
  ...schoolMigrationHandlers,
}

const FAIL_CLOSED_ACTIONS = new Set(Object.keys(ACTION_HANDLERS))

exports.main = async (event = {}) => {
  const action = String(event.action || '').trim()
  const requestId = resolveRequestId('ops-service', event)

  if (!action) return fail(requestId, 'ACTION_REQUIRED', '缺少 action 参数')

  const handler = ACTION_HANDLERS[action]
  if (!handler) return fail(requestId, 'UNKNOWN_ACTION', `未知运维 action: ${action}`)

  try {
    const wxContext = cloud.getWXContext()
    const limitConfig = ADMIN_ACTION_RATE_LIMITS[action]

    if (limitConfig) {
      const limitRes = await rateLimit(wxContext.OPENID, `ops:${action}`, limitConfig)
      if (!limitRes.ok) {
        return fail(requestId, limitRes.code || 'RATE_LIMITED', limitRes.message || '操作过于频繁，请稍后再试')
      }
      if (limitRes.degraded && FAIL_CLOSED_ACTIONS.has(action)) {
        return fail(requestId, 'RATE_LIMIT_UNAVAILABLE', '运维风控校验暂时不可用，请稍后再试')
      }
    }

    return await handler(event, wxContext)
  } catch (err) {
    console.error(`opsService ${action} error:`, err)
    return fail(requestId, 'OPS_SERVICE_FAILED', '运维服务处理失败，请稍后重试')
  }
}
