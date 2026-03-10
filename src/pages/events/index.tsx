import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { fetchEvents } from '../../services/api'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accent: '#F4A261',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await fetchEvents()
      const list = Array.isArray(data) ? data : []

      console.log('events length:', list.length)
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

  usePullDownRefresh(async () => {
    await loadEvents()
    Taro.stopPullDownRefresh()
  })

  const goToDetail = (item: EventItem) => {
    Taro.navigateTo({
      url: `/pages/event-detail/index?id=${item.id}`,
    })
  }

  return (
    <View
      style={{
        padding: '16px',
        backgroundColor: palette.bg,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          border: `1px solid ${palette.line}`,
        }}
      >
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>
            活动
          </Text>
        </View>

        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          查看最近活动，点进详情再决定是否参加。
        </Text>
      </View>

      <View style={{ marginBottom: '14px' }}>
        <Text style={{ color: palette.subtext, fontSize: '13px' }}>
          {loading ? '加载中...' : `共 ${events.length} 场活动`}
        </Text>
      </View>

      {error ? (
        <View
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#FFF1F0',
            borderRadius: '14px',
            border: '1px solid #FFD8D2',
          }}
        >
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      ) : null}

      {!loading && events.length === 0 ? (
        <View
          style={{
            padding: '16px',
            backgroundColor: palette.card,
            borderRadius: '16px',
            border: `1px solid ${palette.line}`,
          }}
        >
          <Text style={{ color: palette.subtext }}>暂无活动数据</Text>
        </View>
      ) : null}

      {events.map((item) => (
        <View
          key={item.id}
          onClick={() => goToDetail(item)}
          style={{
            backgroundColor: palette.card,
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '14px',
            boxSizing: 'border-box',
            border: `1px solid ${palette.line}`,
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <View
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#FFEFD8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '10px',
              }}
            >
              <Text style={{ fontSize: '18px' }}>🌙</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text }}>
                {item.title}
              </Text>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
            <View
              style={{
                padding: '5px 10px',
                borderRadius: '999px',
                backgroundColor: palette.accentSoft,
                marginRight: '8px',
                marginBottom: '8px',
              }}
            >
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                {item.event_type || '未填写'}
              </Text>
            </View>

            <View
              style={{
                padding: '5px 10px',
                borderRadius: '999px',
                backgroundColor: palette.greenSoft,
                marginRight: '8px',
                marginBottom: '8px',
              }}
            >
              <Text style={{ fontSize: '12px', color: palette.green }}>
                {item.is_online ? '线上' : item.location || '线下'}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '14px',
              padding: '12px',
              marginBottom: '10px',
            }}
          >
            <View style={{ marginBottom: '6px' }}>
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                时间：{formatTime(item.start_time)}
              </Text>
            </View>

            <View style={{ marginBottom: '6px' }}>
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                状态：{item.status || '未填写'}
              </Text>
            </View>

            <View>
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                费用：{item.fee || '免费/未填写'}
              </Text>
            </View>
          </View>

          <Text style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}>
            点击查看详情
          </Text>
        </View>
      ))}
    </View>
  )
}