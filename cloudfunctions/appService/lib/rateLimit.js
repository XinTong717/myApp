const { db } = require('./cloud')

function sanitizeDocPart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80)
}

async function rateLimit(openid, action, options = {}) {
  const limit = Math.max(Number(options.limit || 60), 1)
  const windowMs = Math.max(Number(options.windowMs || 60 * 1000), 1000)
  const key = sanitizeDocPart(openid || 'anonymous')
  const actionKey = sanitizeDocPart(action || 'unknown')
  const docId = `${key}_${actionKey}`
  const now = Date.now()

  try {
    let current = null
    try {
      current = (await db.collection('_rate_limits').doc(docId).get()).data || null
    } catch (err) {
      current = null
    }

    const windowStart = Number(current?.windowStart || 0)
    const count = Number(current?.count || 0)
    const shouldReset = !windowStart || now - windowStart >= windowMs
    const nextCount = shouldReset ? 1 : count + 1

    await db.collection('_rate_limits').doc(docId).set({
      data: {
        openid: openid || '',
        action,
        windowStart: shouldReset ? now : windowStart,
        count: nextCount,
        limit,
        windowMs,
        updatedAt: db.serverDate(),
      },
    })

    if (nextCount > limit) {
      return {
        ok: false,
        code: 'RATE_LIMITED',
        message: '操作过于频繁，请稍后再试',
        retryAfterMs: windowMs - (now - (shouldReset ? now : windowStart)),
      }
    }

    return { ok: true }
  } catch (err) {
    console.warn('rateLimit degraded:', err)
    return { ok: true, degraded: true }
  }
}

module.exports = { rateLimit }
