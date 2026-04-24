function createRequestId(prefix = 'app-service') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(prefix, event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId(prefix)
}

function ok(requestId, data = {}) {
  return {
    ok: true,
    code: 'OK',
    requestId,
    ...data,
  }
}

function fail(requestId, code, message, data = {}) {
  return {
    ok: false,
    code,
    requestId,
    message,
    ...data,
  }
}

module.exports = {
  createRequestId,
  resolveRequestId,
  ok,
  fail,
}
