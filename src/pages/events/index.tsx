import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchEvents } from '@/services/api'

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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = async () => {
    try {
      console.log('loadEvents start')
      setLoading(true)
      setError('')

      const data = await fetchEvents()
      const list = Array.isArray(data) ? data : []

      console.log('events length:', list.length)
      console.log('events first item:', list[0])

      setEvents(list)
    } catch (err: any) {
      console.error('loadEvents error:', err)
      setError(err?.message || '读取活动数据失败')
      Taro.showToast({
        title: '活动数据读取失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadEvents()
  })

  return (
    <View style={{ padding: '16px', backgroundColor: '#f7f7f7', minHeight: '100vh' }}>
      <View style={{ marginBottom: '12px' }}>
        <Text style={{ fontSize: '20px', fontWeight: 'bold' }}>活动</Text>
      </View>

      <View style={{ marginBottom: '16px' }}>
        <Text style={{ color: '#666' }}>
          {loading ? '加载中...' : `共 ${events.length} 场活动`}
        </Text>
      </View>

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

      {!loading && events.length === 0 ? (
        <View
          style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
          }}
        >
          <Text>暂无活动数据</Text>
        </View>
      ) : null}

      {events.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        >
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#111111' }}>
              {item.title}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              类型：{item.event_type || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              时间：{formatTime(item.start_time)}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              地点：{item.is_online ? '线上' : item.location || '待定'}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              状态：{item.status || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ color: '#444444' }}>
              组织者：{item.organizer || '未填写'}
            </Text>
          </View>

          <View style={{ marginBottom: item.description ? '6px' : '0' }}>
            <Text style={{ color: '#444444' }}>
              费用：{item.fee || '免费/未填写'}
            </Text>
          </View>

          {item.description ? (
            <View style={{ marginTop: '8px' }}>
              <Text style={{ color: '#666666' }}>{item.description}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}