const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const API_BASE_URL = 'https://d5u4hrog91hgk1gnonmg.baseapi.memfiredb.com/rest/v1'
const API_KEY = String.fromCharCode(101,121,74,104,98,71,99,105,79,105,74,73,85,122,73,49,78,105,73,115,73,110,82,53,99,67,73,54,73,107,112,88,86,67,74,57,46,101,121,74,121,98,50,120,108,73,106,111,105,89,87,53,118,98,105,73,115,73,109,86,52,99,67,73,54,77,122,77,48,78,106,85,49,77,106,103,120,78,83,119,105,97,87,70,48,73,106,111,120,78,122,89,53,78,122,85,121,79,68,69,49,76,67,74,112,99,51,77,105,79,105,74,122,100,88,66,104,89,109,70,122,90,83,74,57,46,54,81,113,82,117,73,74,70,114,116,122,115,118,99,67,76,113,83,101,121,76,69,83,85,114,69,49,118,108,52,79,112,103,108,78,75,119,78,111,50,117,120,52)

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

exports.main = async () => {
  try {
    const res = await cloud.callContainer({
      path: '',
    }).catch(() => null)

    const response = await fetch(`${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_LIST_FIELDS)}&order=start_time.asc`, {
      method: 'GET',
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('getEvents failed:', response.status, text)
      return { ok: false, message: `读取活动失败: ${response.status}`, events: [] }
    }

    const data = await response.json()
    return { ok: true, events: Array.isArray(data) ? data : [] }
  } catch (err) {
    console.error('getEvents error:', err)
    return { ok: false, message: '读取活动失败', events: [] }
  }
}
