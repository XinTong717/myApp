const https = require('https')

const API_BASE_URL = process.env.MEMFIRE_API_BASE_URL || 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = process.env.MEMFIRE_API_KEY

const EVENT_LIST_FIELDS = [
  'id',
  'title',
  'event_type',
  'description',
  'start_time',
  'end_time',
  'location',
  'fee',
  'status',
  'organizer',
  'is_online',
].join(',')

function createRequestId() {
  return `get-events-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
      return { ok: false, code: 'MEMFIRE_API_KEY_MISSING', requestId, message: 'MEMFIRE_API_KEY 未配置', events: [] }
    }

    const url = `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_LIST_FIELDS)}&order=start_time.asc`
    const data = await requestJson(url)
    return { ok: true, code: 'OK', requestId, events: Array.isArray(data) ? data : [] }
  } catch (err) {
    console.error('getEvents error:', err)
    return { ok: false, code: 'GET_EVENTS_FAILED', requestId, message: '读取活动失败', events: [] }
  }
}
