import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { fetchEvents } from '../../services/api'

type EventItem = {
  id: number
  title: string
  event_type: string
  description?: string
  start_time?: string
  end_time?: string
  location?: string
  fee?: string
  status?: string
  organizer?: string
  is_online?: boolean
  contact_info?: string
}

function formatTime(value?: string) {
  if (!value) return '待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d} ${hh}:${mm}`
}

export default function EventDetailPage() {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDetail = async () => {
    try {
      setLoading(true)
      setError('')

      const id = Number(getCurrentInstance().router?.params?.id || 0)
      console.log('event detail id:', id)

      const data = await fetchEvents()
      const list = Array.isArray(data) ? data : []
      const found = list.find((item) => item.id === id) || null

      setEvent(found)
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取活动详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
  })

  return (
    <View style={{ padding: '16px', backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
      {loading ? <Text>加载中...</Text> : null}

      {error ? (
        <View
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fff1f0',
            borderRadius: '10px',
          }}
        >
          <Text style={{ color: '#cf1322' }}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && !event ? <Text>未找到该活动</Text> : null}

      {!loading && event ? (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px',
          }}
        >
          <View style={{ marginBottom: '12px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#111111' }}>
              {event.title}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              类型：{event.event_type || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              开始时间：{formatTime(event.start_time)}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              结束时间：{formatTime(event.end_time)}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              地点：{event.is_online ? '线上' : event.location || '待定'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              状态：{event.status || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              组织者：{event.organizer || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              联系方式：{event.contact_info || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text style={{ color: '#444444' }}>
              费用：{event.fee || '免费/未填写'}
            </Text>
          </View>

          <View>
            <Text style={{ color: '#444444' }}>
              简介：{event.description || '未填写'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}