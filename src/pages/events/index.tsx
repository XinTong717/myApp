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
  location?: string
  fee?: string
  status?: string
  organizer?: string
  is_online?: boolean
  contact_info?: string
}

const TYPE_LABELS: Record<string, string> = {
  night_chat: '夜聊',
  parent_observer: '家长观察',
  community_program: '社区计划',
  workshop: '工作坊',
  meetup: '线下聚会',
}

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  recurring: { text: '每周进行', color: '#7BAE7F', bg: '#EEF7EE' },
  recruiting: { text: '招募中', color: '#E76F51', bg: '#FCE6D6' },
  upcoming: { text: '即将开始', color: '#5B8EBF', bg: '#E8F0F8' },
  ongoing: { text: '进行中', color: '#7BAE7F', bg: '#EEF7EE' },
  ended: { text: '已结束', color: '#999', bg: '#F0F0F0' },
}

const ICONS: Record<string, string> = {
  night_chat: '🌙',
  parent_observer: '👀',
  community_program: '🚀',
  workshop: '🛠️',
  meetup: '☕',
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
      setEvents(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('loadEvents error:', err)
      setError(err?.message || '读取活动数据失败')
      Taro.showToast({ title: '活动数据读取失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { loadEvents() })

  usePullDownRefresh(async () => {
    await loadEvents()
    Taro.stopPullDownRefresh()
  })

  const goToDetail = (item: EventItem) => {
    Taro.navigateTo({ url: `/pages/event-detail/index?id=${item.id}` })
  }

  return (
    <View style={{
      padding: '16px', backgroundColor: palette.bg,
      minHeight: '100vh', boxSizing: 'border-box',
    }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            可雀与自由学社的活动与社区计划。点进详情了解更多。
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: '14px' }}>
        <Text style={{ color: palette.subtext, fontSize: '13px' }}>
          {loading ? '加载中...' : `共 ${events.length} 个活动`}
        </Text>
      </View>

      {error ? (
        <View style={{
          padding: '12px', marginBottom: '16px', backgroundColor: '#FFF1F0',
          borderRadius: '14px', border: '1px solid #FFD8D2',
        }}>
          <Text style={{ color: '#CF1322' }}>{error}</Text>
        </View>
      ) : null}

      {events.map((item) => {
        const typeLabel = TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = STATUS_LABELS[item.status || ''] || { text: item.status || '', color: palette.subtext, bg: '#F5F5F5' }
        const icon = ICONS[item.event_type] || '📌'

        // 从 description 中取第一行作为摘要
        const firstLine = (item.description || '').split('\n').find((l) => l.trim()) || ''
        const summary = firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine

        return (
          <View
            key={item.id}
            onClick={() => goToDetail(item)}
            style={{
              backgroundColor: palette.card, borderRadius: '20px',
              padding: '16px', marginBottom: '14px',
              boxSizing: 'border-box', border: `1px solid ${palette.line}`,
            }}
          >
            <View style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px',
            }}>
              <View style={{
                width: '42px', height: '42px', borderRadius: '14px',
                backgroundColor: '#FFEFD8', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginRight: '10px',
              }}>
                <Text style={{ fontSize: '20px' }}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text, lineHeight: '24px' }}>
                  {item.title}
                </Text>
              </View>
            </View>

            {/* 标签 */}
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
              <View style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '6px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.accentDeep }}>{typeLabel}</Text>
              </View>

              <View style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: statusInfo.bg, marginRight: '8px', marginBottom: '6px',
              }}>
                <Text style={{ fontSize: '12px', color: statusInfo.color }}>{statusInfo.text}</Text>
              </View>

              <View style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '6px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.green }}>
                  {item.is_online ? '线上' : '线下'}
                </Text>
              </View>
            </View>

            {/* 摘要 + 费用 */}
            <View style={{
              backgroundColor: '#FFFDF9', borderRadius: '14px',
              padding: '12px', marginBottom: '10px',
            }}>
              {summary ? (
                <View style={{ marginBottom: '6px' }}>
                  <Text style={{ color: palette.subtext, fontSize: '13px', lineHeight: '20px' }}>
                    {summary}
                  </Text>
                </View>
              ) : null}
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>
                费用：{item.fee || '免费'}
              </Text>
            </View>

            <Text style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}>
              点击查看详情
            </Text>
          </View>
        )
      })}
    </View>
  )
}
