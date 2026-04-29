import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { getEvents } from '../../services/event'
import { palette } from '../../theme/palette'
import {
  type EventItem,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  getEventStatusInfo,
  isEventEnded,
} from './shared'

const FILTER_OPTIONS = ['全部', '线上', '线下'] as const

type FilterValue = typeof FILTER_OPTIONS[number]
type InterestMap = Record<number, number>

type EventItemWithInterest = EventItem & { interest_count?: number }

export default function EventsPage() {
  const [events, setEvents] = useState<EventItemWithInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEnded, setShowEnded] = useState(false)
  const [filter, setFilter] = useState<FilterValue>('全部')
  const [interestCounts, setInterestCounts] = useState<InterestMap>({})

  const applyInterestCounts = (list: EventItemWithInterest[]) => {
    const counts = list.reduce<InterestMap>((acc, item) => {
      const eventId = Number(item.id)
      if (Number.isFinite(eventId) && eventId > 0) {
        acc[eventId] = Number(item.interest_count || 0)
      }
      return acc
    }, {})
    setInterestCounts(counts)
  }

  const loadEvents = async (options: { forceRefresh?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const result = await getEvents({ forceRefresh: !!options.forceRefresh, includeInterestCounts: true })
      const list = Array.isArray(result.events) ? (result.events as EventItemWithInterest[]) : []
      setEvents(list)
      applyInterestCounts(list)
      if (!result?.ok && list.length === 0) {
        setError(result?.message || '读取活动数据失败')
      }
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
    await loadEvents({ forceRefresh: true })
    Taro.stopPullDownRefresh()
  })

  const goToDetail = (item: EventItem) => {
    Taro.navigateTo({ url: `/pages/event-detail/index?id=${item.id}` })
  }

  const goToSubmit = () => {
    Taro.navigateTo({ url: '/pkg/events/submit/index' })
  }

  const visibleEvents = useMemo(() => {
    let list = showEnded ? events : events.filter((item) => !isEventEnded(item))

    if (filter === '线上') {
      list = list.filter((item) => !!item.is_online)
    } else if (filter === '线下') {
      list = list.filter((item) => !item.is_online)
    }

    return list
  }, [events, showEnded, filter])

  const hiddenEndedCount = showEnded ? 0 : events.length - events.filter((item) => !isEventEnded(item)).length

  return (
    <View style={{
      padding: '16px', backgroundColor: palette.bg,
      minHeight: '100vh', boxSizing: 'border-box',
    }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '22px',
        padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
        boxShadow: `0 6px 20px ${palette.shadow}`,
      }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            可雀与自由学社的活动与社区计划。点进详情了解更多，也欢迎提交公开可参与的新活动。
          </Text>
        </View>
        <View onClick={goToSubmit} style={{
          marginTop: '12px', backgroundColor: palette.accentSoft,
          borderRadius: '16px', padding: '10px 12px', alignSelf: 'flex-start',
        }}>
          <Text style={{ fontSize: '13px', color: palette.accentDark, fontWeight: 'bold' }}>+ 推荐新活动</Text>
        </View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option
          return (
            <View key={option} onClick={() => setFilter(option)} style={{
              padding: '6px 14px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
              backgroundColor: active ? palette.accentDeep : palette.surfaceSoft,
              border: `1px solid ${active ? palette.accentDeep : palette.line}`,
            }}>
              <Text style={{ fontSize: '13px', color: active ? '#FFF' : palette.subtext }}>{option}</Text>
            </View>
          )
        })}
      </View>

      <View style={{
        marginBottom: '14px', display: 'flex',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ color: palette.subtext, fontSize: '13px', flex: 1, marginRight: '12px' }}>
          {loading
            ? '加载中...'
            : hiddenEndedCount > 0
              ? `当前显示 ${visibleEvents.length} 个活动，已隐藏 ${hiddenEndedCount} 个已结束活动`
              : `共 ${visibleEvents.length} 个活动`}
        </Text>

        {events.length > 0 && (
          <Text
            onClick={() => setShowEnded((value) => !value)}
            style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}
          >
            {showEnded ? '隐藏已结束' : '显示已结束'}
          </Text>
        )}
      </View>

      {error ? (
        <View style={{
          padding: '12px', marginBottom: '16px', backgroundColor: palette.errorSoft,
          borderRadius: '14px', border: `1px solid ${palette.brandSoft}`,
        }}>
          <Text style={{ color: palette.error }}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && visibleEvents.length === 0 ? (
        <View style={{
          backgroundColor: palette.card, borderRadius: '22px',
          padding: '18px 16px', border: `1px solid ${palette.line}`,
        }}>
          <Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '22px' }}>
            {events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'}
          </Text>
        </View>
      ) : null}

      {visibleEvents.map((item) => {
        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = getEventStatusInfo(item)
        const icon = EVENT_TYPE_ICONS[item.event_type] || '📌'
        const interestedCount = interestCounts[item.id] || 0

        const firstLine = (item.description || '').split('\n').find((line) => line.trim()) || ''
        const summary = firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine

        return (
          <View
            key={item.id}
            onClick={() => goToDetail(item)}
            style={{
              backgroundColor: palette.card, borderRadius: '22px',
              padding: '16px', marginBottom: '14px',
              boxSizing: 'border-box', border: `1px solid ${palette.line}`,
              boxShadow: `0 4px 14px ${palette.shadow}`,
            }}>
            <View style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px',
            }}>
              <View style={{
                width: '42px', height: '42px', borderRadius: '15px',
                backgroundColor: palette.surfaceWarm, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginRight: '10px',
                border: `1px solid ${palette.line}`,
              }}>
                <Text style={{ fontSize: '20px' }}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text, lineHeight: '24px' }}>
                  {item.title}
                </Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
              <View style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: palette.accentSoft, marginRight: '8px', marginBottom: '6px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.accentDark }}>{typeLabel}</Text>
              </View>

              {statusInfo ? (
                <View style={{
                  padding: '4px 10px', borderRadius: '999px',
                  backgroundColor: statusInfo.bg, marginRight: '8px', marginBottom: '6px',
                }}>
                  <Text style={{ fontSize: '12px', color: statusInfo.color }}>{statusInfo.text}</Text>
                </View>
              ) : null}

              <View style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: palette.greenSoft, marginRight: '8px', marginBottom: '6px',
              }}>
                <Text style={{ fontSize: '12px', color: palette.green }}>
                  {item.is_online ? '线上' : '线下'}
                </Text>
              </View>

              {interestedCount > 0 ? (
                <View style={{
                  padding: '4px 10px', borderRadius: '999px',
                  backgroundColor: palette.surfaceWarm, marginRight: '8px', marginBottom: '6px',
                }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep }}>#{interestedCount} 人感兴趣</Text>
                </View>
              ) : null}
            </View>

            <View style={{
              backgroundColor: palette.surface, borderRadius: '16px',
              padding: '12px', marginBottom: '10px', border: `1px solid ${palette.line}`,
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
