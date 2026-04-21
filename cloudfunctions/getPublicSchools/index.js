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
          return reject(new Error(`MemFire schools 请求失败: ${res.statusCode} ${body}`))
        }

        try {
          resolve(JSON.parse(body || '[]'))
        } catch (err) {
          reject(new Error('MemFire schools 返回了无效 JSON'))
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
      'name',
      'province',
      'city',
      'age_range',
      'school_type',
      'fee',
      'official_url',
    ].join(',')

    const schools = await requestJson(`/schools?select=${encodeURIComponent(select)}&order=id.asc`)

    return {
      ok: true,
      schools: Array.isArray(schools) ? schools : [],
    }
  } catch (err) {
    console.error('getPublicSchools error:', err)
    return {
      ok: false,
      schools: [],
      message: '读取学习社区数据失败，请检查云函数环境变量与 MemFire 配置',
    }
  }
}
