import { useEffect, useMemo, useRef, useState } from 'react'
import { Slider, View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getEvents } from '../../services/event'
import { getFilterOptions } from '../../services/filterOptions'
import type { AppFilterOptions } from '../../services/filterOptions'
import { setDetailPreview } from '../../services/detailPreview'
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
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { ALL_FILTER, EVENT_DEFAULT_STATUS_FILTER, EVENT_FILTER_FALLBACKS } from '../../constants/filterOptions'
import type { EventItem } from './shared'
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  getEventIconBg,
  getEventStatusInfo,
  getEventStatusKey,
  isEventEnded,
} from './shared'

const EVENT_SHARE = { appMessage: { title: '可雀活动｜发现教育探索路上的活动', path: '/pages/events/index' }, timeline: { title: '可雀活动｜教育探索活动与自组织计划', query: '' } }
const AGE_FILTER_MIN = 0
const AGE_FILTER_MAX = 30

type InterestMap = Record<number, number>
type EventItemWithInterest = EventItem & { interest_count?: number }

function selectedIncludes(values: string[], option: string) {
  return values.includes(option)
}

function toggleSelected(values: string[], option: string) {
  return selectedIncludes(values, option) ? values.filter((item) => item !== option) : [...values, option]
}

function shouldIncludeEnded(statusFilters: string[]) {
  return statusFilters.length === 0 || statusFilters.includes('ended')
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

function eventMatchesAny<T extends string>(selected: T[], matcher: (filter: T) => boolean) {
  if (selected.length === 0) return true
  return selected.some(matcher)
}

function eventMatchesType(item: EventItemWithInterest, filters: string[], valueMap: Record<string, string>) {
  return eventMatchesAny(filters, (filter) => {
    if (filter === '其他') {
      const knownValues = Object.values(valueMap)
      return !knownValues.includes(item.event_type) || itemHasLabel(item.event_types, '其他')
    }
    if (filter === '交友聚会' && (item.event_type === 'meetup' || itemHasLabel(item.event_types, '线下聚会'))) return true
    return item.event_type === valueMap[filter] || itemHasLabel(item.event_types, filter)
  })
}

function eventMatchesAudience(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => itemHasLabel(item.audience_who, filter) || (String(item.description || '').includes('参与对象：') && String(item.description || '').includes(filter)))
}

function parseAgeValue(value?: string, fallback?: number) {
  const text = String(value || '').trim()
  if (!text || text === '全年龄') return fallback
  const match = text.match(/\d+(?:\.\d+)?/)
  if (!match) return fallback
  const n = Number(match[0])
  return Number.isFinite(n) ? n : fallback
}

function eventMatchesAgeRange(item: EventItemWithInterest, selectedMin: number, selectedMax: number) {
  if (selectedMin <= AGE_FILTER_MIN && selectedMax >= AGE_FILTER_MAX) return true
  const eventMin = parseAgeValue(item.min_age_requirement, AGE_FILTER_MIN) ?? AGE_FILTER_MIN
  const eventMax = parseAgeValue(item.max_age_requirement, AGE_FILTER_MAX) ?? AGE_FILTER_MAX
  return eventMin <= selectedMax && eventMax >= selectedMin
}

function eventMatchesFee(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => {
    const feeCategory = String(item.fee_category || '').trim()
    const feeText = String(item.fee || '').trim()
    if (filter === '付费') return feeCategory === '付费' || (!feeText.includes('免费') && !['公益捐赠', '公益随喜', '费用待确认'].includes(feeText))
    if (filter === '公益随喜') return feeCategory === '公益随喜' || feeText.includes('公益随喜') || feeText.includes('公益捐赠')
    return feeCategory === filter || feeText.includes(filter)
  })
}

function eventMatchesLocation(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => {
    if (filter === '线上') return !!item.is_online
    if (filter === '线下其他') return !item.is_online && !getEventCity(item)
    return !item.is_online && getEventCity(item) === filter
  })
}

function eventMatchesStatus(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => getEventStatusKey(item) === filter)
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='brand' size='md' selected={props.active} interactive onClick={props.onClick} />
}

function MultiFilterRow(props: { title: string; options: string[]; selected: string[]; onChange: (values: string[]) => void; labelFor?: (value: string) => string }) {
  const { title, options, selected, onChange, labelFor } = props
  return (
    <AppFilterRow title={title}>
      <FilterChip key={ALL_FILTER} label={ALL_FILTER} active={selected.length === 0} onClick={() => onChange([])} />
      {options.filter((option) => option !== ALL_FILTER).map((option) => (
        <FilterChip key={option} label={labelFor ? labelFor(option) : option} active={selected.includes(option)} onClick={() => onChange(toggleSelected(selected, option))} />
      ))}
    </AppFilterRow>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItemWithInterest[]>([])
  const [filterOptions, setFilterOptions] = useState<AppFilterOptions['event']>(EVENT_FILTER_FALLBACKS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationFilters, setLocationFilters] = useState<string[]>([])
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [audienceFilters, setAudienceFilters] = useState<string[]>([])
  const [minAgeFilter, setMinAgeFilter] = useState(AGE_FILTER_MIN)
  const [maxAgeFilter, setMaxAgeFilter] = useState(AGE_FILTER_MAX)
  const [statusFilters, setStatusFilters] = useState<string[]>([EVENT_DEFAULT_STATUS_FILTER])
  const [feeFilters, setFeeFilters] = useState<string[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [interestCounts, setInterestCounts] = useState<InterestMap>({})
  const includeEnded = shouldIncludeEnded(statusFilters)
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
    return ['线上', ...cities, ...(hasOfflineWithoutCity ? ['线下其他'] : [])]
  }, [events])

  const ageFilterActive = minAgeFilter > AGE_FILTER_MIN || maxAgeFilter < AGE_FILTER_MAX
  const advancedActiveCount = typeFilters.length + audienceFilters.length + (ageFilterActive ? 1 : 0) + statusFilters.length + feeFilters.length
  const hasActiveFilters = locationFilters.length > 0 || advancedActiveCount > 0
  const resetFilters = () => { setLocationFilters([]); setTypeFilters([]); setAudienceFilters([]); setMinAgeFilter(AGE_FILTER_MIN); setMaxAgeFilter(AGE_FILTER_MAX); setStatusFilters([EVENT_DEFAULT_STATUS_FILTER]); setFeeFilters([]) }

  const visibleEvents = useMemo(() => {
    let list = events
    list = list.filter((item) => eventMatchesLocation(item, locationFilters))
    list = list.filter((item) => eventMatchesStatus(item, statusFilters))
    list = list.filter((item) => eventMatchesType(item, typeFilters, filterOptions.eventTypeValueMap))
    list = list.filter((item) => eventMatchesAudience(item, audienceFilters))
    list = list.filter((item) => eventMatchesAgeRange(item, minAgeFilter, maxAgeFilter))
    list = list.filter((item) => eventMatchesFee(item, feeFilters))
    return list
  }, [events, locationFilters, statusFilters, typeFilters, audienceFilters, minAgeFilter, maxAgeFilter, feeFilters, filterOptions.eventTypeValueMap])

  const hiddenEndedCount = events.length - events.filter((item) => !isEventEnded(item)).length
  const statusLabelFor = (option: string) => EVENT_STATUS_LABELS[option]?.text || option

  return (
    <AppPage>
      <AppPageHeader
        title='活动'
        description='发现教育探索相关的线上线下活动。点击活动可查看详情，欢迎提交新活动。'
        action={<AppMiniButton text='提交活动' onClick={goToSubmit} />}
      />

      <AppCard padding={space(3)}>
        <View className='app-filter-panel__heading'>
          <View className='app-flex-1'><Text className='text-body-strong text-color-main'>筛选活动</Text></View>
          {hasActiveFilters ? <Text onClick={resetFilters} className='text-caption text-color-link'>重置</Text> : null}
          <Text onClick={() => setShowAdvancedFilters((value) => !value)} className='text-caption text-color-link'>{showAdvancedFilters ? '收起' : `更多筛选${advancedActiveCount > 0 ? ` ${advancedActiveCount}` : ''}`}</Text>
        </View>
        <MultiFilterRow title='地点' options={locationOptions} selected={locationFilters} onChange={setLocationFilters} />
        {showAdvancedFilters ? <>
          <MultiFilterRow title='活动类型' options={filterOptions.eventTypes} selected={typeFilters} onChange={setTypeFilters} />
          <MultiFilterRow title='参与对象' options={filterOptions.audience} selected={audienceFilters} onChange={setAudienceFilters} />
          <View style={{ marginBottom: space(4) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.brand }}>年龄区间</Text>
            <View style={{ marginTop: space(2), marginBottom: space(1) }}>
              <Text style={{ ...typography.caption, color: palette.subtext }}>{minAgeFilter}岁 - {maxAgeFilter >= AGE_FILTER_MAX ? `${AGE_FILTER_MAX}岁+` : `${maxAgeFilter}岁`}</Text>
            </View>
            <View style={{ marginBottom: space(2) }}>
              <Text style={{ ...typography.micro, color: palette.muted }}>最小年龄</Text>
              <Slider min={AGE_FILTER_MIN} max={AGE_FILTER_MAX} step={1} value={minAgeFilter} activeColor={palette.accentDeep} blockColor={palette.accentDeep} onChange={(e) => setMinAgeFilter(Math.min(Number(e.detail.value), maxAgeFilter))} />
            </View>
            <View>
              <Text style={{ ...typography.micro, color: palette.muted }}>最大年龄</Text>
              <Slider min={AGE_FILTER_MIN} max={AGE_FILTER_MAX} step={1} value={maxAgeFilter} activeColor={palette.accentDeep} blockColor={palette.accentDeep} onChange={(e) => setMaxAgeFilter(Math.max(Number(e.detail.value), minAgeFilter))} />
            </View>
          </View>
          <MultiFilterRow title='状态' options={filterOptions.status} selected={statusFilters} onChange={setStatusFilters} labelFor={statusLabelFor} />
          <MultiFilterRow title='费用' options={filterOptions.fee} selected={feeFilters} onChange={setFeeFilters} />
        </> : null}
      </AppCard>

      <View className='app-count-line'><Text className='text-meta text-color-muted'>{loading ? '加载中...' : `当前显示 ${visibleEvents.length} / ${events.length} 个活动${statusFilters.length > 0 && !statusFilters.includes('ended') && hiddenEndedCount > 0 ? `，已隐藏 ${hiddenEndedCount} 个已结束报名活动` : ''}。当前优先展示近期活动，可下拉刷新或调整筛选。`}</Text></View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}
      {!loading && error ? <ErrorRetryCard error={error} onRetry={() => loadEvents({ forceRefresh: true, includeEnded })} /> : null}
      {!loading && !error && visibleEvents.length === 0 ? <EmptyCard text={events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'} actionText={events.length > 0 ? '重置筛选' : '提交活动'} onAction={events.length > 0 ? resetFilters : goToSubmit} /> : null}

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
              <View className='app-flex-1'><Text className='text-card-title text-color-main'>{item.title}</Text></View>
            </View>
            <View className='app-list-card__tags'>
              <AppTag text={typeLabel} />
              {statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} /> : null}
              <AppTag text={item.is_online ? '线上' : (getEventCity(item) || '线下')} />
              {item.min_age_requirement ? <AppTag text={item.min_age_requirement} /> : null}
              {interestedCount > 0 ? <AppTag text={`${interestedCount} 人感兴趣`} tone='accent' /> : null}
            </View>
            <View className='app-list-card__meta-box'>
              {summary ? <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>{summary}</Text></View> : null}
              <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>费用：{item.fee || '免费'}</Text></View>
            </View>
          </AppCard>
        )
      })}
    </AppPage>
  )
}
