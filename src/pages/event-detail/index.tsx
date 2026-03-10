import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { fetchEventById } from '../../services/api'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
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

function InfoRow(props: { label: string; value?: string }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderRadius: '14px',
        padding: '12px',
        marginBottom: '10px',
      }}
    >
      <View style={{ marginBottom: '4px' }}>
        <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{props.label}</Text>
      </View>
      <Text style={{ fontSize: '14px', color: palette.text, lineHeight: '21px' }}>
        {props.value || '未填写'}
      </Text>
    </View>
  )
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

      const found = await fetchEventById(id)
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
    <View
      style={{
        padding: '16px',
        backgroundColor: palette.bg,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {loading ? (
        <Text style={{ color: palette.subtext }}>加载中...</Text>
      ) : null}

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

      {!loading && !error && !event ? (
        <Text style={{ color: palette.subtext }}>未找到该活动</Text>
      ) : null}

      {!loading && event ? (
        <>
          <View
            style={{
              backgroundColor: palette.card,
              borderRadius: '20px',
              padding: '18px 16px',
              marginBottom: '14px',
              border: `1px solid ${palette.line}`,
            }}
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <View
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  backgroundColor: '#FFEFD8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '10px',
                }}
              >
                <Text style={{ fontSize: '20px' }}>🌙</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: palette.text,
                    lineHeight: '30px',
                  }}
                >
                  {event.title}
                </Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
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
                  {event.event_type || '未填写'}
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
                  {event.is_online ? '线上' : event.location || '线下'}
                </Text>
              </View>

              <View
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#FFF3E6',
                  marginRight: '8px',
                  marginBottom: '8px',
                }}
              >
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
                  {event.status || '未填写'}
                </Text>
              </View>
            </View>
          </View>

          <InfoRow label='开始时间' value={formatTime(event.start_time)} />
          <InfoRow label='结束时间' value={formatTime(event.end_time)} />
          <InfoRow label='地点' value={event.is_online ? '线上' : event.location || '待定'} />
          <InfoRow label='组织者' value={event.organizer} />
          <InfoRow label='联系方式' value={event.contact_info} />
          <InfoRow label='费用' value={event.fee || '免费/未填写'} />
          <InfoRow label='简介' value={event.description} />
        </>
      ) : null}
    </View>
  )
}