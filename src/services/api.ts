import Taro from '@tarojs/taro'

const API_BASE_URL = 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0NjU1MjgxNSwiaWF0IjoxNzY5NzUyODE1LCJpc3MiOiJzdXBhYmFzZSJ9.6QqRuIJFrtzsvcCLqSeyLESUrE1vl4OpglNKwNo2ux4'

const COMMON_HEADER = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

export async function fetchSchools() {
  const res = await Taro.request({
    url: `${API_BASE_URL}/schools?select=*&order=id.asc`,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('fetchSchools failed:', res.statusCode, res.data)
    throw new Error(`fetchSchools failed: ${res.statusCode}`)
  }
  return res.data
}

export async function fetchEvents() {
  const res = await Taro.request({
    url: `${API_BASE_URL}/events?select=*&order=start_time.asc`,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('fetchEvents failed:', res.statusCode, res.data)
    throw new Error(`fetchEvents failed: ${res.statusCode}`)
  }
  return res.data
}

export async function fetchSchoolById(id: number) {
  const res = await Taro.request({
    url: `${API_BASE_URL}/schools?select=*&id=eq.${id}&limit=1`,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('fetchSchoolById failed:', res.statusCode, res.data)
    throw new Error(`fetchSchoolById failed: ${res.statusCode}`)
  }
  const list = Array.isArray(res.data) ? res.data : []
  return list[0] || null
}

export async function fetchEventById(id: number) {
  const res = await Taro.request({
    url: `${API_BASE_URL}/events?select=*&id=eq.${id}&limit=1`,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('fetchEventById failed:', res.statusCode, res.data)
    throw new Error(`fetchEventById failed: ${res.statusCode}`)
  }
  const list = Array.isArray(res.data) ? res.data : []
  return list[0] || null
}

/**
 * 读取网站端 profiles 表（用于地图展示用户分布）
 * 不读取 wechat / parent_contact / educator_contact 等隐私字段
 */
export async function fetchProfiles() {
  const res = await Taro.request({
    url: `${API_BASE_URL}/profiles?select=id,username,display_name,country,province,city,bio,age,gender,lat,lng&order=id.asc`,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('fetchProfiles failed:', res.statusCode, res.data)
    throw new Error(`fetchProfiles failed: ${res.statusCode}`)
  }
  return res.data
}
