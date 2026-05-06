import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getEvents } from '../../services/event'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import AppChip from '../../components/common/AppChip'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
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

const EVENT_TYPE_FILTER_OPTIONS = ['全部', '圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他']
const AUDIENCE_FILTER_OPTIONS = ['全部', '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他']
const MIN_AGE_FILTER_OPTIONS = ['全部', '全年龄', '6岁+', '12岁+', '18岁+（成人活动）']
const FEE_FILTER_OPTIONS = ['全部', '免费', '付费', '公益捐赠', '费用待确认']
const STATUS_FILTER_OPTIONS = ['未结束', '全部', 'recruiting', 'upcoming', 'ongoing', 'recurring', 'ended']
const EVENT_TYPE_VALUE_MAP: Record<string, string> = { 工作坊: 'workshop', 线下聚会: 'meetup', 线上活动: 'online', 家庭活动: 'family', 项目招募: 'community_program', 圆桌讨论: 'discussion' }
const EVENT_SHARE = { appMessage: { title: '可雀活动｜找到教育探索里的同路活动', path: '/pages/events/index' }, timeline: { title: '可雀活动｜教育探索活动与社区计划', query: '' } }

type InterestMap = Record<number, number>
type EventItemWithInterest = EventItem & { interest_count?: number }

function shouldIncludeEnded(statusFilter: string) {
  return statusFilter === '全部' || statusFilter === 'ended'
}

function normalizeLabels(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(/[、,，/|｜]+/).map((item) => item.trim()).filter(Boolean)
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)))
}

function getEventCity(item: EventItemWithInterest) {
  return String(item.city || '').trim()
}

function itemHasLabel(value: unknown, label: string) {
  const labels = normalizeLabels(value)
  const text = labels.join(' / ')
  return labels.includes(label) || text.includes(label)
}

function eventMatchesType(item: EventItemWithInterest, filter: string) {
  if (filter === '全部') return true
  if (filter === '其他') {
    const knownValues = Object.values(EVENT_TYPE_VALUE_MAP)
    return !knownValues.includes(item.event_type) || itemHasLabel(item.event_types, '其他')
  }
  return item.event_type === EVENT_TYPE_VALUE_MAP[filter] || itemHasLabel(item.event_types, filter)
}

function eventMatchesAudience(item: EventItemWithInterest, filter: string) {
  if (filter === '全部') return true
  return itemHasLabel(item.audience_who, filter) || (String(item.description || '').includes('参与对象：') && String(item.description || '').includes(filter))
}

function eventMatchesMinAge(item: EventItemWithInterest, filter: string) {
  if (filter === '全部') return true
  const value = String(item.min_age_requirement || '').trim()
  return value === filter || String(item.description || '').includes(`最低年龄要求：${filter}`)
}

function eventMatchesFee(item: EventItemWithInterest, filter: string) {
  if (filter === '全部') return true
  const feeCategory = String(item.fee_category || '').trim()
  const feeText = String(item.fee || '').trim()
  if (filter === '付费') return feeCategory === '付费' || (!feeText.includes('免费') && !['公益捐赠', '费用待确认'].includes(feeText))
  return feeCategory === filter || feeText.includes(filter)
}

function eventMatchesLocation(item: EventItemWithInterest, filter: string) {
  if (filter === '全部') return true
  if (filter === '线上') return !!item.is_online
  if (filter === '线下其他') return !item.is_online && !getEventCity(item)
  return !item.is_online && getEventCity(item) === filter
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='action' size='md' selected={props.active} interactive onClick={props.onClick} />
}

function FilterRow(props: { title: string; children: any }) {
  return <View style={{ marginBottom: space(2) }}><Text style={{ ...typography.bodyStrong, color: palette.subtext }}>{props.title}</Text><ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', marginTop: space(2) }}><View style={{ display: 'inline-flex', flexDirection: 'row' }}>{props.children}</View></ScrollView></View>
}

function MiniPrimaryButton(props: { text: string; onClick: () => void }) {
  return (
    <View onClick={props.onClick} style={{ backgroundColor: palette.brand, borderRadius: radius.md, padding: `${space(2)} ${space(3)}` }}>
      <Text style={{ ...typography.button, color: '#FFFFFF' }}>{props.text}</Text>
    </View>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItemWithInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationFilter, setLocationFilter] = useState('全部')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [audienceFilter, setAudienceFilter] = useState('全部')
  const [minAgeFilter, setMinAgeFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('未结束')
  const [feeFilter, setFeeFilter] = useState('全部')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [interestCounts, setInterestCounts] = useState<InterestMap>({})
  const includeEnded = shouldIncludeEnded(statusFilter)

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

  const loadEvents = async (options: { forceRefresh?: boolean; includeEnded?: boolean } = {}) => {
    try {
      const nextIncludeEnded = options.includeEnded ?? includeEnded
      setLoading(true)
      setError('')
      const result = await getEvents({ forceRefresh: !!options.forceRefresh, includeInterestCounts: true, includeEnded: nextIncludeEnded })
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

  useDidShow(() => { loadEvents({ includeEnded }) })
  useEffect(() => { loadEvents({ includeEnded }) }, [includeEnded])
  usePullDownRefresh(async () => { await loadEvents({ forceRefresh: true, includeEnded }); Taro.stopPullDownRefresh() })

  const goToDetail = (item: EventItem) => { setDetailPreview('event', item.id, item); Taro.navigateTo({ url: `/pages/event-detail/index?id=${item.id}` }) }
  const goToSubmit = () => { Taro.navigateTo({ url: '/pkg/events/submit/index' }) }

  const locationOptions = useMemo(() => {
    const cities = uniqueValues(events.filter((item) => !item.is_online).map(getEventCity))
    const hasOfflineWithoutCity = events.some((item) => !item.is_online && !getEventCity(item))
    return ['全部', '线上', ...cities, ...(hasOfflineWithoutCity ? ['线下其他'] : [])]
  }, [events])

  const advancedActiveCount = [typeFilter !== '全部', audienceFilter !== '全部', minAgeFilter !== '全部', statusFilter !== '未结束', feeFilter !== '全部'].filter(Boolean).length
  const hasActiveFilters = locationFilter !== '全部' || advancedActiveCount > 0
  const resetFilters = () => { setLocationFilter('全部'); setTypeFilter('全部'); setAudienceFilter('全部'); setMinAgeFilter('全部'); setStatusFilter('未结束'); setFeeFilter('全部') }

  const visibleEvents = useMemo(() => {
    let list = events
    list = list.filter((item) => eventMatchesLocation(item, locationFilter))
    if (statusFilter === '未结束') list = list.filter((item) => !isEventEnded(item))
    else if (statusFilter !== '全部') list = list.filter((item) => getEventStatusKey(item) === statusFilter)
    list = list.filter((item) => eventMatchesType(item, typeFilter))
    list = list.filter((item) => eventMatchesAudience(item, audienceFilter))
    list = list.filter((item) => eventMatchesMinAge(item, minAgeFilter))
    list = list.filter((item) => eventMatchesFee(item, feeFilter))
    return list
  }, [events, locationFilter, statusFilter, typeFilter, audienceFilter, minAgeFilter, feeFilter])

  const hiddenEndedCount = events.length - events.filter((item) => !isEventEnded(item)).length

  return (
    <View style={{ padding: space(4), backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      <AppCard padding={`${space(4)} ${space(4)}`}>
        <Text style={{ ...typography.title, color: palette.text }}>活动</Text>
        <View style={{ marginTop: space(2) }}>
          <Text style={{ ...typography.meta, color: palette.subtext }}>可雀与自由学社的活动与社区计划。点进详情了解更多，也欢迎提交公开可参与的新活动。</Text>
        </View>
        <View style={{ marginTop: space(3), alignSelf: 'flex-start' }}>
          <MiniPrimaryButton text='+ 推荐新活动' onClick={goToSubmit} />
        </View>
      </AppCard>

      <AppCard padding={space(3)} radius={radius.md}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(2) }}><View style={{ flex: 1 }}><Text style={{ ...typography.bodyStrong, color: palette.text }}>筛选活动</Text></View>{hasActiveFilters ? <Text onClick={resetFilters} style={{ ...typography.caption, color: palette.link, marginRight: space(3) }}>重置</Text> : null}<Text onClick={() => setShowAdvancedFilters((value) => !value)} style={{ ...typography.caption, color: palette.link }}>{showAdvancedFilters ? '收起' : `更多筛选${advancedActiveCount > 0 ? ` ${advancedActiveCount}` : ''}`}</Text></View>
        <FilterRow title='地点'>{locationOptions.map((option) => <FilterChip key={option} label={option} active={locationFilter === option} onClick={() => setLocationFilter(option)} />)}</FilterRow>
        {showAdvancedFilters ? <>
          <FilterRow title='活动类型'>{EVENT_TYPE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={typeFilter === option} onClick={() => setTypeFilter(option)} />)}</FilterRow>
          <FilterRow title='参与对象'>{AUDIENCE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={audienceFilter === option} onClick={() => setAudienceFilter(option)} />)}</FilterRow>
          <FilterRow title='最低年龄'>{MIN_AGE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={minAgeFilter === option} onClick={() => setMinAgeFilter(option)} />)}</FilterRow>
          <FilterRow title='状态'>{STATUS_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option === '全部' || option === '未结束' ? option : (EVENT_STATUS_LABELS[option]?.text || option)} active={statusFilter === option} onClick={() => setStatusFilter(option)} />)}</FilterRow>
          <FilterRow title='费用'>{FEE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={feeFilter === option} onClick={() => setFeeFilter(option)} />)}</FilterRow>
        </> : null}
      </AppCard>

      <View style={{ marginBottom: space(4), display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ ...typography.meta, color: palette.muted, flex: 1, marginRight: space(3) }}>{loading ? '加载中...' : `当前显示 ${visibleEvents.length} / ${events.length} 个活动${statusFilter === '未结束' && hiddenEndedCount > 0 ? `，已隐藏 ${hiddenEndedCount} 个已结束活动` : ''}`}</Text></View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}
      {!loading && error ? <ErrorRetryCard error={error} onRetry={() => loadEvents({ forceRefresh: true, includeEnded })} /> : null}
      {!loading && !error && visibleEvents.length === 0 ? <EmptyCard text={events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'} actionText={events.length > 0 ? '重置筛选' : '推荐新活动'} onAction={events.length > 0 ? resetFilters : goToSubmit} /> : null}

      {!loading && !error && visibleEvents.map((item) => {
        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = getEventStatusInfo(item)
        const interestedCount = interestCounts[item.id] || 0
        const firstLine = (item.description || '').split('\n').find((line) => line.trim()) || ''
        const summary = firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine
        return <AppCard key={item.id} onClick={() => goToDetail(item)}><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(3) }}><View style={{ marginRight: space(3) }}><AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(item.event_type)} bordered /></View><View style={{ flex: 1 }}><Text style={{ ...typography.sectionTitle, color: palette.text }}>{item.title}</Text></View></View><View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(3) }}><AppTag text={typeLabel} padding={`${space(1)} ${space(2)}`} marginBottom={space(2)} />{statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} padding={`${space(1)} ${space(2)}`} marginBottom={space(2)} /> : null}<AppTag text={item.is_online ? '线上' : (getEventCity(item) || '线下')} padding={`${space(1)} ${space(2)}`} marginBottom={space(2)} />{item.min_age_requirement ? <AppTag text={item.min_age_requirement} padding={`${space(1)} ${space(2)}`} marginBottom={space(2)} /> : null}{interestedCount > 0 ? <AppTag text={`#${interestedCount} 人感兴趣`} tone='accent' padding={`${space(1)} ${space(2)}`} marginBottom={space(2)} /> : null}</View><View style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space(3), marginBottom: space(3), border: `1px solid ${palette.line}` }}>{summary ? <View style={{ marginBottom: space(2) }}><Text style={{ ...typography.meta, color: palette.subtext }}>{summary}</Text></View> : null}<Text style={{ ...typography.meta, color: palette.subtext }}>费用：{item.fee || '免费'}</Text></View><Text style={{ ...typography.button, color: palette.link }}>查看详情 ›</Text></AppCard>
      })}
    </View>
  )
}
