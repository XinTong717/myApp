const https = require('https')

const API_BASE_URL = process.env.MEMFIRE_API_BASE_URL || 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = process.env.MEMFIRE_API_KEY
const DEFAULT_TIMEOUT_MS = 5000

function createError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function requestJson(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
          return reject(createError('UPSTREAM_HTTP_ERROR', `HTTP ${res.statusCode}: ${body}`))
        }
        try {
          resolve(JSON.parse(body || '[]'))
        } catch (err) {
          reject(createError('UPSTREAM_BAD_JSON', 'upstream returned invalid JSON'))
        }
      })
    })

    req.setTimeout(timeoutMs, () => {
      req.destroy(createError('UPSTREAM_TIMEOUT', 'upstream timeout'))
    })

    req.on('error', (err) => {
      if (err?.code === 'UPSTREAM_TIMEOUT') {
        reject(err)
        return
      }
      reject(createError(err?.code || 'UPSTREAM_REQUEST_FAILED', err?.message || 'upstream request failed'))
    })

    req.end()
  })
}

module.exports = {
  API_BASE_URL,
  API_KEY,
  requestJson,
  DEFAULT_TIMEOUT_MS,
}
