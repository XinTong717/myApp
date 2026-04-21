const https = require('https')

const API_BASE_URL = process.env.MEMFIRE_API_BASE_URL || 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = process.env.MEMFIRE_API_KEY

const SCHOOL_DETAIL_FIELDS = [
  'id',
  'name',
  'province',
  'city',
  'age_range',
  'school_type',
  'has_xuji',
  'xuji_note',
  'residency_req',
  'admission_req',
  'fee',
  'output_direction',
  'official_url',
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
      return { ok: false, message: 'MEMFIRE_API_KEY 未配置', school: null }
    }

    const schoolId = Number(event?.schoolId || 0)
    if (!schoolId) {
      return { ok: false, message: 'schoolId 无效', school: null }
    }

    const url = `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_DETAIL_FIELDS)}&id=eq.${schoolId}&limit=1`
    const data = await requestJson(url)

    return {
      ok: true,
      school: Array.isArray(data) ? (data[0] || null) : null,
    }
  } catch (err) {
    console.error('getSchoolDetail error:', err)
    return { ok: false, message: '读取学习社区详情失败', school: null }
  }
}