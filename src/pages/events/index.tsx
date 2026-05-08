import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getEvents } from '../../services/event'
import { getFilterOptions, type AppFilterOptions } from '../../services/filterOptions'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import AppPage from '../../components/common/AppPage'
import AppPageHeader from '../../components/common/AppPageHeader'
import AppMiniButton from '../../components/common/AppMiniButton'
import AppFilterRow from '../../components/common/AppFilterRow'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import AppChip from '../../components/common/AppChip'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
import { ListSkeleton } from '../../components/common/Skeleton'
import { ALL_FILTER, EVENT_DEFAULT_STATUS_FILTER, EVENT_FILTER_FALLBACKS } from '../../constants/filterOptions'
import {
  type EventItem,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  getEventIconBg,
  getEventStatusInfo,
  getEventStatusKey,
  isEventEnded,
} from './shared'

const EVENT_SHARE = { appMessage: { title: '可雀活动｜找到教育探索里的同路活动', path: '/pages/events/index' }, timeline: { title: '可雀活动｜教育探索活动与社区计划', query: '' } }

type InterestMap = Record<number, number>
type EventItemWithInterest = EventItem & { interest_count?: number }

function shouldIncludeEnded(statusFilter: string) {
  return statusFilter === ALL_FILTER || statusFilter === 'ended'
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

function eventMatchesType(item: EventItemWithInterest, filter: string, valueMap: Record<string, string>) {
  if (filter === ALL_FILTER) return true
  if (filter === '其他') {
    const knownValues = Object.values(valueMap)
    return !knownValues.includes(item.event_type) || itemHasLabel(item.event_types, '其他')
  }
  return item.event_type === valueMap[filter] || itemHasLabel(item.event_types, filter)
}

function eventMatchesAudience(item: EventItemWithInterest, filter: string) {
  if (filter === ALL_FILTER) return true
  return itemHasLabel(item.audience_who, filter) || (String(item.description || '').includes('参与对象：') && String(item.description || '').includes(filter))
}

function eventMatchesMinAge(item: EventItemWithInterest, filter: string) {
  if (filter === ALL_FILTER) return true
  const value = String(item.min_age_requirement || '').trim()
  return value === filter || String(item.description || '').includes(`最低年龄要求：${filter}`)
}

function eventMatchesFee(item: EventItemWithInterest, filter: string) {
  if (filter === ALL_FILTER) return true
  const feeCategory = String(item.fee_category || '').trim()
  const feeText = String(item.fee || '').trim()
  if (filter === '付费') return feeCategory === '付费' || (!feeText.includes('免费') && !['公益捐赠', '费用待确认'].includes(feeText))
  return feeCategory === filter || feeText.includes(filter)
}

function eventMatchesLocation(item: EventItemWithInterest, filter: string) {
  if (filter === ALL_FILTER) return true
  if (filter === '线上') return !!item.is_online
  if (filter === '线下其他') return !item.is_online && !getEventCity(item)
  return !item.is_online && getEventCity(item) === filter
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='action' size='md' selected={props.active} interactive onClick={props.onClick} />
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItemWithInterest[]>([])
  const [filterOptions, setFilterOptions] = useState<AppFilterOptions['event']>(EVENT_FILTER_FALLBACKS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER)
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER)
  const [audienceFilter, setAudienceFilter] = useState(ALL_FILTER)
  const [minAgeFilter, setMinAgeFilter] = useState(ALL_FILTER)
  const [statusFilter, setStatusFilter] = useState(EVENT_DEFAULT_STATUS_FILTER)
  const [feeFilter, setFeeFilter] = useState(ALL_FILTER)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [interestCounts, setInterestCounts] = useState<InterestMap>({})
  const includeEnded = shouldIncludeEnded(statusFilter)
  const loadedIncludeEndedRef = useRef<boolean | null>(null)
  const loadSeqRef = useRef(0)

  useShareAppMessage(() => EVENT_SHARE.appMessage)
  useShareTimeline(() => EVENT_SHARE.timeline)

  useEffect(() => {
    getFilterOptions().then((options) => setFilterOptions(options.event)).catch((err) => {
      console.warn('load event filter options skipped:', err)
    })
  }, [])

  const applyInterestCounts = (list: EventItemWithInterest[]) => {
    const counts = list.reduce<InterestMap>((acc, item) => {
      const eventId = Number(item.id)
      if (Number.isFinite(eventId) && eventId > 0) acc[eventId] = Number(item.interest_count || 0)
      return acc
    }, {})
    setInterestCounts(counts)
  }

  const loadEvents = async (options: { forceRefresh?: boolean; includeEnded?: boolean } = {}) => {
    const requestSeq = loadSeqRef.current + 1
    loadSeqRef.current = requestSeq
    const nextIncludeEnded = options.includeEnded ?? includeEnded
    try {
      setLoading(true)
      setError('')
      const result = await getEvents({ forceRefresh: !!options.forceRefresh, includeInterestCounts: true, includeEnded: nextIncludeEnded })
      if (requestSeq !== loadSeqRef.current) return
      const list = Array.isArray(result.events) ? (result.events as EventItemWithInterest[]) : []
      setEvents(list)
      applyInterestCounts(list)
      loadedIncludeEndedRef.current = nextIncludeEnded
      if (!result?.ok && list.length === 0) setError(result?.message || '读取活动数据失败')
    } catch (err: any) {
      if (requestSeq !== loadSeqRef.current) return
      console.error('loadEvents error:', err)
      setError(err?.message || '读取活动数据失败')
      Taro.showToast({ title: '活动数据读取失败', icon: 'none' })
    } finally {
      if (requestSeq === loadSeqRef.current) setLoading(false)
    }
  }

  useDidShow(() => {
    if (loadedIncludeEndedRef.current === includeEnded) return
    loadEvents({ includeEnded })
  })

  useEffect(() => {
    if (!includeEnded || loadedIncludeEndedRef.current === true) return
    loadEvents({ includeEnded: true })
  }, [includeEnded])

  usePullDownRefresh(async () => { await loadEvents({ forceRefresh: true, includeEnded }); Taro.stopPullDownRefresh() })

  const goToDetail = (item: EventItem) => { setDetailPreview('event', item.id, item); Taro.navigateTo({ url: `/pages/event-detail/index?id=${item.id}` }) }
  const goToSubmit = () => { Taro.navigateTo({ url: '/pkg/events/submit/index' }) }

  const locationOptions = useMemo(() => {
    const cities = uniqueValues(events.filter((item) => !item.is_online).map(getEventCity))
    const hasOfflineWithoutCity = events.some((item) => !item.is_online && !getEventCity(item))
    return [ALL_FILTER, '线上', ...cities, ...(hasOfflineWithoutCity ? ['线下其他'] : [])]
  }, [events])

  const advancedActiveCount = [typeFilter !== ALL_FILTER, audienceFilter !== ALL_FILTER, minAgeFilter !== ALL_FILTER, statusFilter !== EVENT_DEFAULT_STATUS_FILTER, feeFilter !== ALL_FILTER].filter(Boolean).length
  const hasActiveFilters = locationFilter !== ALL_FILTER || advancedActiveCount > 0
  const resetFilters = () => { setLocationFilter(ALL_FILTER); setTypeFilter(ALL_FILTER); setAudienceFilter(ALL_FILTER); setMinAgeFilter(ALL_FILTER); setStatusFilter(EVENT_DEFAULT_STATUS_FILTER); setFeeFilter(ALL_FILTER) }

  const visibleEvents = useMemo(() => {
    let list = events
    list = list.filter((item) => eventMatchesLocation(item, locationFilter))
    if (statusFilter === EVENT_DEFAULT_STATUS_FILTER) list = list.filter((item) => !isEventEnded(item))
    else if (statusFilter !== ALL_FILTER) list = list.filter((item) => getEventStatusKey(item) === statusFilter)
    list = list.filter((item) => eventMatchesType(item, typeFilter, filterOptions.eventTypeValueMap))
    list = list.filter((item) => eventMatchesAudience(item, audienceFilter))
    list = list.filter((item) => eventMatchesMinAge(item, minAgeFilter))
    list = list.filter((item) => eventMatchesFee(item, feeFilter))
    return list
  }, [events, locationFilter, statusFilter, typeFilter, audienceFilter, minAgeFilter, feeFilter, filterOptions.eventTypeValueMap])

  const hiddenEndedCount = events.length - events.filter((item) => !isEventEnded(item)).length

  return (
    <AppPage>
      <AppPageHeader
        title='活动'
        description='可雀与自由学社的活动与社区计划。点进详情了解更多，也欢迎提交公开可参与的新活动。'
        action={<AppMiniButton text='+ 推荐新活动' onClick={goToSubmit} />}
      />

      <AppCard padding='12px'>
        <View className='app-filter-panel__heading'>
          <View className='app-flex-1'><Text className='text-body-strong text-color-main'>筛选活动</Text></View>
          {hasActiveFilters ? <Text onClick={resetFilters} className='text-caption text-color-link'>重置</Text> : null}
          <Text onClick={() => setShowAdvancedFilters((value) => !value)} className='text-caption text-color-link'>{showAdvancedFilters ? '收起' : `更多筛选${advancedActiveCount > 0 ? ` ${advancedActiveCount}` : ''}`}</Text>
        </View>
        <AppFilterRow title='地点'>{locationOptions.map((option) => <FilterChip key={option} label={option} active={locationFilter === option} onClick={() => setLocationFilter(option)} />)}</AppFilterRow>
        {showAdvancedFilters ? <>
          <AppFilterRow title='活动类型'>{filterOptions.eventTypes.map((option) => <FilterChip key={option} label={option} active={typeFilter === option} onClick={() => setTypeFilter(option)} />)}</AppFilterRow>
          <AppFilterRow title='参与对象'>{filterOptions.audience.map((option) => <FilterChip key={option} label={option} active={audienceFilter === option} onClick={() => setAudienceFilter(option)} />)}</AppFilterRow>
          <AppFilterRow title='最低年龄'>{filterOptions.minAge.map((option) => <FilterChip key={option} label={option} active={minAgeFilter === option} onClick={() => setMinAgeFilter(option)} />)}</AppFilterRow>
          <AppFilterRow title='状态'>{filterOptions.status.map((option) => <FilterChip key={option} label={option === ALL_FILTER || option === EVENT_DEFAULT_STATUS_FILTER ? option : (EVENT_STATUS_LABELS[option]?.text || option)} active={statusFilter === option} onClick={() => setStatusFilter(option)} />)}</AppFilterRow>
          <AppFilterRow title='费用'>{filterOptions.fee.map((option) => <FilterChip key={option} label={option} active={feeFilter === option} onClick={() => setFeeFilter(option)} />)}</AppFilterRow>
        </> : null}
      </AppCard>

      <View className='app-count-line'><Text className='text-meta text-color-muted'>{loading ? '加载中...' : `当前显示 ${visibleEvents.length} / ${events.length} 个活动${statusFilter === EVENT_DEFAULT_STATUS_FILTER && hiddenEndedCount > 0 ? `，已隐藏 ${hiddenEndedCount} 个已结束活动` : ''}`}</Text></View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}
      {!loading && error ? <ErrorRetryCard error={error} onRetry={() => loadEvents({ forceRefresh: true, includeEnded })} /> : null}
      {!loading && !error && visibleEvents.length === 0 ? <EmptyCard text={events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'} actionText={events.length > 0 ? '重置筛选' : '推荐新活动'} onAction={events.length > 0 ? resetFilters : goToSubmit} /> : null}

      {!loading && !error && visibleEvents.map((item) => {
        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = getEventStatusInfo(item)
        const interestedCount = interestCounts[item.id] || 0
        const firstLine = (item.description || '').split('\n').find((line) => line.trim()) || ''
        const summary = firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine
        return (
          <AppCard key={item.id} onClick={() => goToDetail(item)}>
            <View className='app-list-card__header'>
              <View className='app-list-card__icon'><AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(item.event_type)} bordered /></View>
              <View className='app-flex-1'><Text className='text-section-title text-color-main'>{item.title}</Text></View>
            </View>
            <View className='app-list-card__tags'>
              <AppTag text={typeLabel} />
              {statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} /> : null}
              <AppTag text={item.is_online ? '线上' : (getEventCity(item) || '线下')} />
              {item.min_age_requirement ? <AppTag text={item.min_age_requirement} /> : null}
              {interestedCount > 0 ? <AppTag text={`#${interestedCount} 人感兴趣`} tone='accent' /> : null}
            </View>
            <View className='app-list-card__meta-box'>
              {summary ? <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>{summary}</Text></View> : null}
              <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>费用：{item.fee || '免费'}</Text></View>
            </View>
            <Text className='text-button text-color-link'>查看详情 ›</Text>
          </AppCard>
        )
      })}
    </AppPage>
  )
}
