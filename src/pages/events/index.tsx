import { useMemo, useState } from 'react'
import { ScrollView, View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getEvents } from '../../services/event'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import { ListSkeleton } from '../../components/common/Skeleton'
import {
  type EventItem,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  getEventIconBg,
  getEventStatusInfo,
  getEventStatusKey,
  isEventEnded,
} from './shared'

const MODE_FILTER_OPTIONS = ['全部', '线上', '线下'] as const
const EVENT_SHARE = {
  appMessage: {
    title: '可雀活动｜找到教育探索里的同路活动',
    path: '/pages/events/index',
  },
  timeline: {
    title: '可雀活动｜教育探索活动与社区计划',
    query: '',
  },
}

type ModeFilterValue = typeof MODE_FILTER_OPTIONS[number]
type InterestMap = Record<number, number>
type EventItemWithInterest = EventItem & { interest_count?: number }

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <View onClick={props.onClick} style={{
      padding: '6px 12px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
      backgroundColor: props.active ? palette.action : palette.tag,
      border: `1px solid ${props.active ? palette.action : palette.line}`,
    }}>
      <Text style={{ fontSize: '12px', color: props.active ? '#FFF' : palette.tagText }}>{props.label}</Text>
    </View>
  )
}

function FilterRow(props: { title: string; children: any }) {
  return (
    <View style={{ marginBottom: '4px' }}>
      <Text style={{ fontSize: '12px', color: palette.subtext, fontWeight: 'bold' }}>{props.title}</Text>
      <ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', marginTop: '6px' }}>
        <View style={{ display: 'inline-flex', flexDirection: 'row' }}>{props.children}</View>
      </ScrollView>
    </View>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItemWithInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modeFilter, setModeFilter] = useState<ModeFilterValue>('全部')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('未结束')
  const [feeFilter, setFeeFilter] = useState('全部')
  const [interestCounts, setInterestCounts] = useState<InterestMap>({})

  useShareAppMessage(() => EVENT_SHARE.appMessage)
  useShareTimeline(() => EVENT_SHARE.timeline)

  const applyInterestCounts = (list: EventItemWithInterest[]) => {
    const counts = list.reduce<InterestMap>((acc, item) => {
      const eventId = Number(item.id)
      if (Number.isFinite(eventId) && eventId > 0) acc[eventId] = Number(item.interest_count || 0)
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
      if (!result?.ok && list.length === 0) setError(result?.message || '读取活动数据失败')
    } catch (err: any) {
      console.error('loadEvents error:', err)
      setError(err?.message || '读取活动数据失败')
      Taro.showToast({ title: '活动数据读取失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadEvents()
  })

  usePullDownRefresh(async () => {
    await loadEvents({ forceRefresh: true })
    Taro.stopPullDownRefresh()
  })

  const goToDetail = (item: EventItem) => {
    setDetailPreview('event', item.id, item)
    Taro.navigateTo({ url: `/pages/event-detail/index?id=${item.id}` })
  }

  const goToSubmit = () => {
    Taro.navigateTo({ url: '/pkg/events/submit/index' })
  }

  const typeOptions = useMemo(() => ['全部', ...uniqueValues(events.map((item) => item.event_type))], [events])
  const statusOptions = useMemo(() => ['未结束', '全部', ...uniqueValues(events.map((item) => getEventStatusKey(item)).filter((item) => item && item !== 'ended'))], [events])
  const feeOptions = useMemo(() => {
    const extra = uniqueValues(events.map((item) => String(item.fee || '').trim()).filter((item) => item && item !== '免费')).slice(0, 8)
    return ['全部', '免费', '付费/其他', ...extra]
  }, [events])

  const hasActiveFilters = modeFilter !== '全部' || typeFilter !== '全部' || statusFilter !== '未结束' || feeFilter !== '全部'

  const resetFilters = () => {
    setModeFilter('全部')
    setTypeFilter('全部')
    setStatusFilter('未结束')
    setFeeFilter('全部')
  }

  const visibleEvents = useMemo(() => {
    let list = events

    if (statusFilter === '未结束') list = list.filter((item) => !isEventEnded(item))
    else if (statusFilter !== '全部') list = list.filter((item) => getEventStatusKey(item) === statusFilter)

    if (modeFilter === '线上') list = list.filter((item) => !!item.is_online)
    else if (modeFilter === '线下') list = list.filter((item) => !item.is_online)

    if (typeFilter !== '全部') list = list.filter((item) => item.event_type === typeFilter)

    if (feeFilter === '免费') list = list.filter((item) => String(item.fee || '').includes('免费'))
    else if (feeFilter === '付费/其他') list = list.filter((item) => !String(item.fee || '').includes('免费'))
    else if (feeFilter !== '全部') list = list.filter((item) => String(item.fee || '').trim() === feeFilter)

    return list
  }, [events, statusFilter, modeFilter, typeFilter, feeFilter])

  const hiddenEndedCount = events.length - events.filter((item) => !isEventEnded(item)).length

  return (
    <View style={{ padding: '16px', backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      <AppCard padding='18px 16px'>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            可雀与自由学社的活动与社区计划。点进详情了解更多，也欢迎提交公开可参与的新活动。
          </Text>
        </View>
        <View onClick={goToSubmit} style={{ marginTop: '12px', background: palette.primaryGradient, borderRadius: '16px', padding: '10px 12px', alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 'bold' }}>+ 推荐新活动</Text>
        </View>
      </AppCard>

      <AppCard padding='12px' radius='18px'>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '8px' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '13px', color: palette.text, fontWeight: 'bold' }}>筛选活动</Text>
          </View>
          {hasActiveFilters ? <Text onClick={resetFilters} style={{ fontSize: '12px', color: palette.link }}>重置</Text> : null}
        </View>

        <FilterRow title='形式'>
          {MODE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={modeFilter === option} onClick={() => setModeFilter(option)} />)}
        </FilterRow>

        <FilterRow title='类型'>
          {typeOptions.map((option) => <FilterChip key={option} label={EVENT_TYPE_LABELS[option] || option} active={typeFilter === option} onClick={() => setTypeFilter(option)} />)}
        </FilterRow>

        <FilterRow title='状态'>
          {statusOptions.map((option) => <FilterChip key={option} label={option === '全部' || option === '未结束' ? option : (EVENT_STATUS_LABELS[option]?.text || option)} active={statusFilter === option} onClick={() => setStatusFilter(option)} />)}
        </FilterRow>

        <FilterRow title='费用'>
          {feeOptions.map((option) => <FilterChip key={option} label={option} active={feeFilter === option} onClick={() => setFeeFilter(option)} />)}
        </FilterRow>
      </AppCard>

      <View style={{ marginBottom: '14px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.muted, fontSize: '13px', flex: 1, marginRight: '12px' }}>
          {loading ? '加载中...' : `当前显示 ${visibleEvents.length} / ${events.length} 个活动${statusFilter === '未结束' && hiddenEndedCount > 0 ? `，已隐藏 ${hiddenEndedCount} 个已结束活动` : ''}`}
        </Text>
      </View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}

      {!loading && error ? (
        <View style={{ padding: '12px', marginBottom: '16px', backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.brandSoft}` }}>
          <Text style={{ color: palette.error }}>{error}</Text>
          <View onClick={() => loadEvents({ forceRefresh: true })} style={{ marginTop: '10px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px', alignSelf: 'flex-start' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '12px', fontWeight: 'bold' }}>重新加载</Text>
          </View>
        </View>
      ) : null}

      {!loading && !error && visibleEvents.length === 0 ? (
        <AppCard padding='18px 16px'>
          <Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '22px' }}>{events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'}</Text>
          <View onClick={events.length > 0 ? resetFilters : goToSubmit} style={{ marginTop: '12px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '9px 12px', alignSelf: 'flex-start' }}>
            <Text style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}>{events.length > 0 ? '重置筛选' : '推荐新活动'}</Text>
          </View>
        </AppCard>
      ) : null}

      {!loading && !error && visibleEvents.map((item) => {
        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = getEventStatusInfo(item)
        const interestedCount = interestCounts[item.id] || 0
        const firstLine = (item.description || '').split('\n').find((line) => line.trim()) || ''
        const summary = firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine

        return (
          <AppCard key={item.id} onClick={() => goToDetail(item)}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px' }}>
              <View style={{ marginRight: '10px' }}><AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(item.event_type)} bordered /></View>
              <View style={{ flex: 1 }}><Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text, lineHeight: '24px' }}>{item.title}</Text></View>
            </View>
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
              <AppTag text={typeLabel} padding='4px 10px' marginBottom='6px' />
              {statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} padding='4px 10px' marginBottom='6px' /> : null}
              <AppTag text={item.is_online ? '线上' : '线下'} padding='4px 10px' marginBottom='6px' />
              {interestedCount > 0 ? <AppTag text={`#${interestedCount} 人感兴趣`} tone='accent' padding='4px 10px' marginBottom='6px' /> : null}
            </View>
            <View style={{ backgroundColor: palette.surface, borderRadius: '16px', padding: '12px', marginBottom: '10px', border: `1px solid ${palette.line}` }}>
              {summary ? <View style={{ marginBottom: '6px' }}><Text style={{ color: palette.subtext, fontSize: '13px', lineHeight: '20px' }}>{summary}</Text></View> : null}
              <Text style={{ color: palette.subtext, fontSize: '13px' }}>费用：{item.fee || '免费'}</Text>
            </View>
            <Text style={{ color: palette.link, fontSize: '13px', fontWeight: 'bold' }}>查看详情 ›</Text>
          </AppCard>
        )
      })}
    </View>
  )
}
