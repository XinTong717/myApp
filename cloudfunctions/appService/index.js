const { ok, fail, resolveRequestId } = require('./lib/response')
const { cloud } = require('./lib/cloud')
const { rateLimit } = require('./lib/rateLimit')
const publicHandlers = require('./handlers/public')
const eventContactHandlers = require('./handlers/eventContact')
const userHandlers = require('./handlers/userProfile')
const requestHandlers = require('./handlers/requests')
const mapUserHandlers = require('./handlers/mapUsers')
const adminHandlers = require('./handlers/admin')
const adminPublishHandlers = require('./handlers/adminPublish')
const legalConsentHandlers = require('./handlers/legalConsent')
const { hasCurrentConsent } = require('./lib/legalConsent')

const { ACTION_RATE_LIMITS } = require('./lib/rateLimits.config')

const FAIL_CLOSED_RATE_LIMIT_ACTIONS = new Set([
  'submitEvent',
  'submitCommunity',
  'submitCorrection',
  'sendRequest',
  'reportUser',
  'toggleEventInterest',
  'getEventContactInfo',
  'publishEventDirect',
  'reviewEventSubmission',
])

const CONSENT_REQUIRED_ACTIONS = new Set([
  'saveProfile',
  'updatePrivacySettings',
  'requestAccountDeletion',
  'submitEvent',
  'submitCommunity',
  'submitCorrection',
  'sendRequest',
  'respondRequest',
  'manageConnection',
  'manageSafetyRelation',
  'reportUser',
  'toggleEventInterest',
  'getEventContactInfo',
])

async function getOpenId(event, wxContext) {
  const requestId = resolveRequestId('get-openid', event)
  return ok(requestId, {
    openid: wxContext.OPENID,
  })
}

const publicActionHandlers = {
  ...legalConsentHandlers,
  ...publicHandlers,
  ...eventContactHandlers,
  ...mapUserHandlers,
}

const userActionHandlers = {
  ...userHandlers,
  ...requestHandlers,
}

const adminActionHandlers = {
  ...adminHandlers,
  ...adminPublishHandlers,
}

const actionHandlers = {
  getOpenId,
  ...publicActionHandlers,
  ...userActionHandlers,
  ...adminActionHandlers,
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

    if (CONSENT_REQUIRED_ACTIONS.has(action)) {
      const consentOk = await hasCurrentConsent(wxContext.OPENID)
      if (!consentOk) {
        return fail(requestId, 'LEGAL_CONSENT_REQUIRED', '请先阅读并同意用户协议和隐私政策')
      }
    }

    const limitConfig = ACTION_RATE_LIMITS[action]

    if (limitConfig) {
      const limitRes = await rateLimit(wxContext.OPENID, action, limitConfig)
      if (!limitRes.ok) {
        return fail(requestId, limitRes.code || 'RATE_LIMITED', limitRes.message || '操作过于频繁，请稍后再试')
      }
      if (limitRes.degraded && FAIL_CLOSED_RATE_LIMIT_ACTIONS.has(action)) {
        return fail(requestId, 'RATE_LIMIT_UNAVAILABLE', '风控校验暂时不可用，请稍后再试')
      }
    }

    return await handler(event, wxContext)
  } catch (err) {
    console.error(`appService ${action} error:`, err)
    return fail(requestId, 'APP_SERVICE_FAILED', '服务处理失败，请稍后重试')
  }
}
