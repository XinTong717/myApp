const https = require('https')

const API_BASE_URL = process.env.MEMFIRE_API_BASE_URL || 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = process.env.MEMFIRE_API_KEY

const SCHOOL_LIST_FIELDS = [
  'id',
  'name',
  'province',
  'city',
  'age_range',
  'school_type',
].join(',')

function createRequestId() {
  return `get-schools-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
}

function requestJson(url) {
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
          return reject(new Error(`HTTP ${res.statusCode}: ${body}`))
        }
        try {
          resolve(JSON.parse(body || '[]'))
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)

  try {
    if (!API_KEY) {
      return { ok: false, code: 'MEMFIRE_API_KEY_MISSING', requestId, message: 'MEMFIRE_API_KEY 未配置', schools: [] }
    }

    const url = `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_LIST_FIELDS)}&order=id.asc`
    const data = await requestJson(url)

    return {
      ok: true,
      code: 'OK',
      requestId,
      schools: Array.isArray(data) ? data : [],
    }
  } catch (err) {
    console.error('getSchools error:', err)
    return { ok: false, code: 'GET_SCHOOLS_FAILED', requestId, message: '读取学习社区失败', schools: [] }
  }
}
