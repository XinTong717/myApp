const { db, _ } = require('./cloud')

const RATE_LIMIT_COLLECTION = 'rate_limits'

function sanitizeDocPart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80)
}

async function readLimitDoc(docId) {
  try {
    return (await db.collection(RATE_LIMIT_COLLECTION).doc(docId).get()).data || null
  } catch (err) {
    return null
  }
}

async function resetLimitWindow(docId, payload) {
  await db.collection(RATE_LIMIT_COLLECTION).doc(docId).set({
    data: {
      ...payload,
      count: 0,
      updatedAt: db.serverDate(),
    },
  })
}

async function incrementLimitCounter(docId) {
  await db.collection(RATE_LIMIT_COLLECTION).doc(docId).update({
    data: {
      count: _.inc(1),
      updatedAt: db.serverDate(),
    },
  })

  return readLimitDoc(docId)
}

async function rateLimit(openid, action, options = {}) {
  const limit = Math.max(Number(options.limit || 60), 1)
  const windowMs = Math.max(Number(options.windowMs || 60 * 1000), 1000)
  const key = sanitizeDocPart(openid || 'anonymous')
  const actionKey = sanitizeDocPart(action || 'unknown')
  const docId = `${key}_${actionKey}`
  const now = Date.now()

  try {
    const current = await readLimitDoc(docId)
    const windowStart = Number(current?.windowStart || 0)
    const shouldReset = !windowStart || now - windowStart >= windowMs
    const effectiveWindowStart = shouldReset ? now : windowStart

    if (shouldReset || !current) {
      await resetLimitWindow(docId, {
        openid: openid || '',
        action,
        windowStart: effectiveWindowStart,
        limit,
        windowMs,
      })
    }

    let fresh = null
    try {
      fresh = await incrementLimitCounter(docId)
    } catch (err) {
      await resetLimitWindow(docId, {
        openid: openid || '',
        action,
        windowStart: now,
        limit,
        windowMs,
      })
      fresh = await incrementLimitCounter(docId)
    }

    const nextCount = Number(fresh?.count || 1)
    const freshWindowStart = Number(fresh?.windowStart || effectiveWindowStart || now)

    if (nextCount > limit) {
      return {
        ok: false,
        code: 'RATE_LIMITED',
        message: '操作过于频繁，请稍后再试',
        retryAfterMs: Math.max(0, windowMs - (now - freshWindowStart)),
      }
    }

    return { ok: true }
  } catch (err) {
    console.warn('rateLimit degraded:', err)
    return { ok: true, degraded: true }
  }
}

module.exports = { rateLimit, RATE_LIMIT_COLLECTION }
