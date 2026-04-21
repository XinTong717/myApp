const https = require('https')

const API_BASE_URL = process.env.MEMFIRE_API_BASE_URL || 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = process.env.MEMFIRE_API_KEY

const EVENT_DETAIL_FIELDS = [
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
  try {
    if (!API_KEY) {
      return { ok: false, message: 'MEMFIRE_API_KEY 未配置', event: null }
    }

    const eventId = Number(event?.eventId || 0)
    if (!eventId) {
      return { ok: false, message: 'eventId 无效', event: null }
    }

    const url = `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_DETAIL_FIELDS)}&id=eq.${eventId}&limit=1`
    const data = await requestJson(url)
    return { ok: true, event: Array.isArray(data) ? (data[0] || null) : null }
  } catch (err) {
    console.error('getEventDetail error:', err)
    return { ok: false, message: '读取活动详情失败', event: null }
  }
}