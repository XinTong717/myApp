const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')

const ALLOWED_LEVELS = new Set(['error', 'warn', 'info'])
const MAX_FIELD_LENGTH = 300

function cleanString(value, max = MAX_FIELD_LENGTH) {
  return String(value || '').trim().slice(0, max)
}

async function logClientError(event, wxContext) {
  const requestId = resolveRequestId('log-client-error', event)
  const level = ALLOWED_LEVELS.has(event.level) ? event.level : 'error'
  const source = cleanString(event.source || 'client')
  const action = cleanString(event.action)
  const code = cleanString(event.code)
  const message = cleanString(event.message, 500)
  const page = cleanString(event.page)
  const clientRequestId = cleanString(event.relatedRequestId || event.requestId)

  // Avoid storing user input, stack traces, or arbitrary payloads. This collection is
  // for admin-readable failure breadcrumbs only.
  try {
    await db.collection('client_error_logs').add({
      data: {
        openid: wxContext.OPENID || '',
        level,
        source,
        action,
        code,
        message,
        page,
        relatedRequestId: clientRequestId,
        runtimeEnv: cleanString(event.runtimeEnv),
        cloudEnv: cleanString(event.cloudEnv),
        createdAt: db.serverDate(),
      },
    })
    return ok(requestId, { message: 'logged' })
  } catch (err) {
    console.error('appService logClientError error:', err)
    return fail(requestId, 'LOG_CLIENT_ERROR_FAILED', '客户端错误日志写入失败')
  }
}

module.exports = {
  logClientError,
}
