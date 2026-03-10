import Taro from '@tarojs/taro'

const API_BASE_URL = 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0NjU1MjgxNSwiaWF0IjoxNzY5NzUyODE1LCJpc3MiOiJzdXBhYmFzZSJ9.6QqRuIJFrtzsvcCLqSeyLESUrE1vl4OpglNKwNo2ux4'

export async function fetchSchools() {
  const res = await Taro.request({
    url: `${API_BASE_URL}/schools?select=*&order=id.asc`,
    method: 'GET',
    header: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  return res.data
}

export async function fetchEvents() {
  const res = await Taro.request({
    url: `${API_BASE_URL}/events?select=*&order=start_time.asc`,
    method: 'GET',
    header: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  return res.data
}