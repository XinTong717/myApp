const { ok, fail, resolveRequestId } = require('./lib/response')
const { cloud } = require('./lib/cloud')
const { rateLimit } = require('./lib/rateLimit')
const filterOptionHandlers = require('./handlers/filterOptions')
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

function toBootstrapPart(settled) {
  if (settled.status === 'fulfilled') {
    const value = settled.value || {}
    return {
      ok: value.ok !== false,
      data: value,
      code: value.code || '',
      message: value.message || '',
    }
  }

  return {
    ok: false,
    data: null,
    code: 'BOOTSTRAP_PART_FAILED',
    message: '该模块加载失败，可稍后重试',
  }
}

async function getProfileBootstrap(event, wxContext) {
  const requestId = resolveRequestId('profile-bootstrap', event)
  const pendingEvent = {
    ...event,
    section: 'pending',
    offset: 0,
    limit: Number(event.limit || 50),
  }

  const [profile, pendingRequests, safetyOverview, adminAccess, legalConsent] = await Promise.allSettled([
    userHandlers.getMe(event, wxContext),
    requestHandlers.getMyRequests(pendingEvent, wxContext),
    userHandlers.getSafetyOverview(event, wxContext),
    adminHandlers.checkAdminAccess(event, wxContext),
    legalConsentHandlers.getLegalConsentStatus(event, wxContext),
  ])

  return ok(requestId, {
    profile: toBootstrapPart(profile),
    pendingRequests: toBootstrapPart(pendingRequests),
    safetyOverview: toBootstrapPart(safetyOverview),
    adminAccess: toBootstrapPart(adminAccess),
    legalConsent: toBootstrapPart(legalConsent),
  })
}

const publicActionHandlers = {
  ...filterOptionHandlers,
  ...legalConsentHandlers,
  ...publicHandlers,
  ...eventContactHandlers,
  ...mapUserHandlers,
}

const userActionHandlers = {
  getProfileBootstrap,
  ...userHandlers,
  ...requestHandlers,
}

const adminActionHandlers = {
  ...adminHandlers,
  ...adminPublishHandlers,
}

// Operational / migration actions are intentionally not registered in appService.
// Keep public user traffic and maintenance endpoints separated; run maintenance
// from CloudBase console or a dedicated ops-only function when needed.
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
