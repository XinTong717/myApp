const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const API_BASE_URL = String(process.env.MEMFIRE_API_BASE_URL || '').trim().replace(/\/$/, '')
const API_KEY = String(process.env.MEMFIRE_API_KEY || '').trim()

function getRequiredEnv() {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error('未配置 MemFire 读取环境变量')
  }
  return { apiBaseUrl: API_BASE_URL, apiKey: API_KEY }
}

function requestJson(path) {
  const { apiBaseUrl, apiKey } = getRequiredEnv()
  const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`MemFire events 请求失败: ${res.statusCode} ${body}`))
        }

        try {
          resolve(JSON.parse(body || '[]'))
        } catch (err) {
          reject(new Error('MemFire events 返回了无效 JSON'))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

exports.main = async () => {
  try {
    const select = [
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

    const events = await requestJson(`/events?select=${encodeURIComponent(select)}&order=start_time.asc`)

    return {
      ok: true,
      events: Array.isArray(events) ? events : [],
    }
  } catch (err) {
    console.error('getPublicEvents error:', err)
    return {
      ok: false,
      events: [],
      message: '读取活动数据失败，请检查云函数环境变量与 MemFire 配置',
    }
  }
}
