import Taro from '@tarojs/taro'

const API_BASE_URL = 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0NjU1MjgxNSwiaWF0IjoxNzY5NzUyODE1LCJpc3MiOiJzdXBhYmFzZSJ9.6QqRuIJFrtzsvcCLqSeyLESUrE1vl4OpglNKwNo2ux4'

const COMMON_HEADER = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

const SCHOOL_LIST_FIELDS = [
  'id',
  'name',
  'province',
  'city',
  'age_range',
  'school_type',
].join(',')

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

async function requestList(url: string) {
  const res = await Taro.request({
    url,
    method: 'GET',
    header: COMMON_HEADER,
  })
  if (res.statusCode !== 200) {
    console.error('MemFire request failed:', res.statusCode, res.data)
    throw new Error(`request failed: ${res.statusCode}`)
  }
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchSchools() {
  return requestList(
    `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_LIST_FIELDS)}&order=id.asc`
  )
}

export async function fetchEvents() {
  return requestList(
    `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_LIST_FIELDS)}&order=start_time.asc`
  )
}

export async function fetchSchoolById(id: number) {
  const list = await requestList(
    `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_DETAIL_FIELDS)}&id=eq.${id}&limit=1`
  )
  return list[0] || null
}

export async function fetchEventById(id: number) {
  const list = await requestList(
    `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_DETAIL_FIELDS)}&id=eq.${id}&limit=1`
  )
  return list[0] || null
}