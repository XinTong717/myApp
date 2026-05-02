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

const EVENT_TYPE_FILTER_OPTIONS = ['全部', '圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他']
const AUDIENCE_FILTER_OPTIONS = ['全部', '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他']
const MIN_AGE_FILTER_OPTIONS = ['全部', '全年龄', '6岁+', '12岁+', '18岁+（成人活动）']
const FEE_FILTER_OPTIONS = ['全部', '免费', '付费', '公益捐赠', '费用待确认']
const STATUS_FILTER_OPTIONS = ['未结束', '全部', 'recruiting', 'upcoming', 'ongoing', 'recurring', 'ended']
const EVENT_TYPE_VALUE_MAP: Record<string, string> = { 工作坊: 'workshop', 线下聚会: 'meetup', 线上活动: 'online', 家庭活动: 'family', 项目招募: 'community_program', 圆桌讨论: 'discussion' }
const EVENT_SHARE = { appMessage: { title: '可雀活动｜找到教育探索里的同路活动', path: '/pages/events/index' }, timeline: { title: '可雀活动｜教育探索活动与社区计划', query: '' } }

type InterestMap = Record<number, number>
type EventItemWithInterest = EventItem & { interest_count?: number }

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
  return <View onClick={props.onClick} style={{ padding: '6px 12px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px', backgroundColor: props.active ? palette.action : palette.tag, border: `1px solid ${props.active ? palette.action : palette.line}` }}><Text style={{ fontSize: '12px', color: props.active ? '#FFF' : palette.tagText }}>{props.label}</Text></View>
}

function FilterRow(props: { title: string; children: any }) {
  return <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext, fontWeight: 'bold' }}>{props.title}</Text><ScrollView scrollX enhanced showScrollbar={false} style={{ whiteSpace: 'nowrap', marginTop: '6px' }}><View style={{ display: 'inline-flex', flexDirection: 'row' }}>{props.children}</View></ScrollView></View>
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

  useDidShow(() => { loadEvents() })
  usePullDownRefresh(async () => { await loadEvents({ forceRefresh: true }); Taro.stopPullDownRefresh() })

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
    <View style={{ padding: '16px', backgroundColor: palette.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      <AppCard padding='18px 16px'><Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>活动</Text><View style={{ marginTop: '6px' }}><Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>可雀与自由学社的活动与社区计划。点进详情了解更多，也欢迎提交公开可参与的新活动。</Text></View><View onClick={goToSubmit} style={{ marginTop: '12px', background: palette.primaryGradient, borderRadius: '16px', padding: '10px 12px', alignSelf: 'flex-start' }}><Text style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 'bold' }}>+ 推荐新活动</Text></View></AppCard>

      <AppCard padding='12px' radius='18px'>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '8px' }}><View style={{ flex: 1 }}><Text style={{ fontSize: '13px', color: palette.text, fontWeight: 'bold' }}>筛选活动</Text></View>{hasActiveFilters ? <Text onClick={resetFilters} style={{ fontSize: '12px', color: palette.link, marginRight: '12px' }}>重置</Text> : null}<Text onClick={() => setShowAdvancedFilters((value) => !value)} style={{ fontSize: '12px', color: palette.link }}>{showAdvancedFilters ? '收起' : `更多筛选${advancedActiveCount > 0 ? ` ${advancedActiveCount}` : ''}`}</Text></View>
        <FilterRow title='地点'>{locationOptions.map((option) => <FilterChip key={option} label={option} active={locationFilter === option} onClick={() => setLocationFilter(option)} />)}</FilterRow>
        {showAdvancedFilters ? <>
          <FilterRow title='活动类型'>{EVENT_TYPE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={typeFilter === option} onClick={() => setTypeFilter(option)} />)}</FilterRow>
          <FilterRow title='参与对象'>{AUDIENCE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={audienceFilter === option} onClick={() => setAudienceFilter(option)} />)}</FilterRow>
          <FilterRow title='最低年龄'>{MIN_AGE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={minAgeFilter === option} onClick={() => setMinAgeFilter(option)} />)}</FilterRow>
          <FilterRow title='状态'>{STATUS_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option === '全部' || option === '未结束' ? option : (EVENT_STATUS_LABELS[option]?.text || option)} active={statusFilter === option} onClick={() => setStatusFilter(option)} />)}</FilterRow>
          <FilterRow title='费用'>{FEE_FILTER_OPTIONS.map((option) => <FilterChip key={option} label={option} active={feeFilter === option} onClick={() => setFeeFilter(option)} />)}</FilterRow>
        </> : null}
      </AppCard>

      <View style={{ marginBottom: '14px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: palette.muted, fontSize: '13px', flex: 1, marginRight: '12px' }}>{loading ? '加载中...' : `当前显示 ${visibleEvents.length} / ${events.length} 个活动${statusFilter === '未结束' && hiddenEndedCount > 0 ? `，已隐藏 ${hiddenEndedCount} 个已结束活动` : ''}`}</Text></View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}
      {!loading && error ? <View style={{ padding: '12px', marginBottom: '16px', backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.brandSoft}` }}><Text style={{ color: palette.error }}>{error}</Text><View onClick={() => loadEvents({ forceRefresh: true })} style={{ marginTop: '10px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '8px 12px', alignSelf: 'flex-start' }}><Text style={{ color: palette.accentDeep, fontSize: '12px', fontWeight: 'bold' }}>重新加载</Text></View></View> : null}
      {!loading && !error && visibleEvents.length === 0 ? <AppCard padding='18px 16px'><Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '22px' }}>{events.length > 0 ? '当前筛选下没有可显示的活动。' : '暂时还没有活动。'}</Text><View onClick={events.length > 0 ? resetFilters : goToSubmit} style={{ marginTop: '12px', backgroundColor: palette.accentSoft, borderRadius: '12px', padding: '9px 12px', alignSelf: 'flex-start' }}><Text style={{ color: palette.accentDeep, fontSize: '13px', fontWeight: 'bold' }}>{events.length > 0 ? '重置筛选' : '推荐新活动'}</Text></View></AppCard> : null}

      {!loading && !error && visibleEvents.map((item) => {
        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type
        const statusInfo = getEventStatusInfo(item)
        const interestedCount = interestCounts[item.id] || 0
        const firstLine = (item.description || '').split('\n').find((line) => line.trim()) || ''
        const summary = firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine
        return <AppCard key={item.id} onClick={() => goToDetail(item)}><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px' }}><View style={{ marginRight: '10px' }}><AppIcon name='calendar' size={42} backgroundColor={getEventIconBg(item.event_type)} bordered /></View><View style={{ flex: 1 }}><Text style={{ fontSize: '17px', fontWeight: 'bold', color: palette.text, lineHeight: '24px' }}>{item.title}</Text></View></View><View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}><AppTag text={typeLabel} padding='4px 10px' marginBottom='6px' />{statusInfo ? <AppTag text={statusInfo.text} backgroundColor={statusInfo.bg} textColor={statusInfo.color} padding='4px 10px' marginBottom='6px' /> : null}<AppTag text={item.is_online ? '线上' : (getEventCity(item) || '线下')} padding='4px 10px' marginBottom='6px' />{item.min_age_requirement ? <AppTag text={item.min_age_requirement} padding='4px 10px' marginBottom='6px' /> : null}{interestedCount > 0 ? <AppTag text={`#${interestedCount} 人感兴趣`} tone='accent' padding='4px 10px' marginBottom='6px' /> : null}</View><View style={{ backgroundColor: palette.surface, borderRadius: '16px', padding: '12px', marginBottom: '10px', border: `1px solid ${palette.line}` }}>{summary ? <View style={{ marginBottom: '6px' }}><Text style={{ color: palette.subtext, fontSize: '13px', lineHeight: '20px' }}>{summary}</Text></View> : null}<Text style={{ color: palette.subtext, fontSize: '13px' }}>费用：{item.fee || '免费'}</Text></View><Text style={{ color: palette.link, fontSize: '13px', fontWeight: 'bold' }}>查看详情 ›</Text></AppCard>
      })}
    </View>
  )
}
