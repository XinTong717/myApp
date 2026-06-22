import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getSchools } from '../../services/school'
import { getFilterOptions, type AppFilterOptions } from '../../services/filterOptions'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppPage from '../../components/common/AppPage'
import AppPageHeader from '../../components/common/AppPageHeader'
import AppMiniButton from '../../components/common/AppMiniButton'
import AppSearchBox from '../../components/common/AppSearchBox'
import AppFilterRow from '../../components/common/AppFilterRow'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import AppChip from '../../components/common/AppChip'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
import { ListSkeleton } from '../../components/common/Skeleton'
import { SCHOOL_FILTER_FALLBACKS } from '../../constants/filterOptions'
import type { SchoolItem, SchoolLocationItem } from '../../types/domain'

const SCHOOL_SHARE = {
  appMessage: {
    title: '可雀学习社区库｜找到适合教育探索的场域',
    path: '/pages/schools/index',
  },
  timeline: {
    title: '可雀学习社区库｜教育探索地图与社区资料',
    query: '',
  },
}

const AGE_RANGE_MIN = 0
const AGE_RANGE_MAX = 30

type School = SchoolItem

type AgeKeywordRange = {
  min: number
  max: number
  keywords: string[]
}

const AGE_KEYWORD_RANGES: AgeKeywordRange[] = [
  { min: 0, max: 6, keywords: ['学龄前', '幼儿园', '幼儿', '托育', '早教', '幼小'] },
  { min: 7, max: 12, keywords: ['小学', '小学生', '儿童'] },
  { min: 13, max: 15, keywords: ['初中', '初中生'] },
  { min: 16, max: 18, keywords: ['高中', '高中生'] },
  { min: 13, max: 18, keywords: ['中学', '中学生', '青少年'] },
  { min: 19, max: 24, keywords: ['大学', '大学生', '高校', '本科', '青年'] },
  { min: 25, max: Number.POSITIVE_INFINITY, keywords: ['成人', '家长', '教师', '教育者'] },
]

const EXCLUDED_TYPE_LABELS = [
  '主打动手中学习的STEAM教育机构',
  '主打科学实验的STEM教育机构',
]

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='brand' size='md' selected={props.active} interactive onClick={props.onClick} />
}

function splitTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getStableSchoolId(item: School, index: number) {
  return String(item.id || item.canonical_name || item.name || index)
}

function stripParenthetical(value: string) {
  let text = String(value || '').trim()
  let previous = ''
  while (text && text !== previous) {
    previous = text
    text = text.replace(/（[^（）]*）/g, '').replace(/\([^()]*\)/g, '').trim()
  }
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeSchoolTypeLabel(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (EXCLUDED_TYPE_LABELS.some((label) => raw.includes(label))) return ''
  return stripParenthetical(raw)
}

function schoolTypeLabels(value?: string) {
  return Array.from(new Set(splitTokens(value).map(normalizeSchoolTypeLabel).filter(Boolean)))
}

function normalizeTypeOptions(options: string[]) {
  return Array.from(new Set(options.map(normalizeSchoolTypeLabel).filter(Boolean)))
}

function buildOptionCountMap(source: School[], getLabels: (item: School) => string[]) {
  const counts = new Map<string, Set<string>>()
  source.forEach((item, index) => {
    const schoolId = getStableSchoolId(item, index)
    Array.from(new Set(getLabels(item).filter(Boolean))).forEach((label) => {
      if (!counts.has(label)) counts.set(label, new Set())
      counts.get(label)?.add(schoolId)
    })
  })
  return counts
}

function optionCount(counts: Map<string, Set<string>>, option: string) {
  return counts.get(option)?.size || 0
}

function sortOptionsByCount(options: string[], counts: Map<string, Set<string>>) {
  return [...options].sort((a, b) => {
    const countDiff = optionCount(counts, b) - optionCount(counts, a)
    if (countDiff !== 0) return countDiff
    return a.localeCompare(b, 'zh-CN')
  })
}

function countedOptions(allOption: string, preferred: string[], counts: Map<string, Set<string>>, max: number) {
  const sourceOptions = preferred.length > 0 ? preferred : Array.from(counts.keys())
  const options = sortOptionsByCount(
    Array.from(new Set(sourceOptions.filter((item) => item && item !== allOption && optionCount(counts, item) > 0))),
    counts
  ).slice(0, max)
  return [allOption, ...options]
}

function normalizeAgeText(value?: string) {
  return String(value || '')
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[~～—–至到]/g, '-')
    .trim()
}

function getAgeSpans(value?: string): Array<{ min: number; max: number }> {
  const text = normalizeAgeText(value)
  if (!text) return []

  const spans: Array<{ min: number; max: number }> = []
  const rangePattern = /(\d{1,2}(?:\.\d+)?)\s*(?:岁)?\s*-\s*(\d{1,2}(?:\.\d+)?)/g
  let rangeMatch: RegExpExecArray | null
  while ((rangeMatch = rangePattern.exec(text))) {
    const a = Number(rangeMatch[1])
    const b = Number(rangeMatch[2])
    if (Number.isFinite(a) && Number.isFinite(b)) spans.push({ min: Math.min(a, b), max: Math.max(a, b) })
  }

  const plusPattern = /(\d{1,2}(?:\.\d+)?)\s*(?:岁)?\s*(?:\+|以上|及以上)/g
  let plusMatch: RegExpExecArray | null
  while ((plusMatch = plusPattern.exec(text))) {
    const min = Number(plusMatch[1])
    if (Number.isFinite(min)) spans.push({ min, max: Number.POSITIVE_INFINITY })
  }

  const underPattern = /(\d{1,2}(?:\.\d+)?)\s*(?:岁)?\s*(?:以下|以内|以下儿童)/g
  let underMatch: RegExpExecArray | null
  while ((underMatch = underPattern.exec(text))) {
    const max = Number(underMatch[1])
    if (Number.isFinite(max)) spans.push({ min: 0, max })
  }

  if (spans.length > 0) return spans

  if (text.includes('小学') && text.includes('高中')) return [{ min: 7, max: 18 }]
  if (text.includes('小学') && text.includes('初中')) return [{ min: 7, max: 15 }]
  if (text.includes('初中') && text.includes('高中')) return [{ min: 13, max: 18 }]
  if ((text.includes('幼儿园') || text.includes('学龄前')) && text.includes('小学')) return [{ min: 0, max: 12 }]
  if ((text.includes('幼儿园') || text.includes('学龄前')) && text.includes('高中')) return [{ min: 0, max: 18 }]

  return AGE_KEYWORD_RANGES
    .filter((range) => range.keywords.some((keyword) => text.includes(keyword)))
    .map((range) => ({ min: range.min, max: range.max }))
}

function rangesOverlap(a: { min: number; max: number }, b: { min: number; max: number }) {
  return Math.max(a.min, b.min) <= Math.min(a.max, b.max)
}

function schoolMatchesAgeRange(value: string | undefined, minAge: number, maxAge: number) {
  if (minAge <= AGE_RANGE_MIN && maxAge >= AGE_RANGE_MAX) return true
  const spans = getAgeSpans(value)
  return spans.some((span) => rangesOverlap(span, { min: minAge, max: maxAge }))
}

function formatAgeNumber(value: number) {
  if (!Number.isFinite(value)) return `${AGE_RANGE_MAX}+`
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, '')
}

function formatAgeRange(minAge: number, maxAge: number) {
  return `${formatAgeNumber(minAge)}-${formatAgeNumber(maxAge)}${maxAge >= AGE_RANGE_MAX ? '岁+' : '岁'}`
}

function formatAgeRangeForDisplay(value?: string) {
  const spans = getAgeSpans(value)
  if (spans.length === 0) return String(value || '').trim()
  const min = Math.min(...spans.map((span) => span.min))
  const max = Math.max(...spans.map((span) => span.max))
  return formatAgeRange(min, max)
}

function clampAge(value: number, min = AGE_RANGE_MIN, max = AGE_RANGE_MAX) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function getTouchPageX(event: any) {
  return Number(event?.touches?.[0]?.pageX ?? event?.changedTouches?.[0]?.pageX ?? 0)
}

function AgeRangeSlider(props: { minValue: number; maxValue: number; onChange: (minValue: number, maxValue: number) => void }) {
  const trackIdRef = useRef(`school-age-range-${Math.random().toString(36).slice(2)}`)
  const activeHandleRef = useRef<'min' | 'max'>('min')
  const minPercent = ((props.minValue - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100
  const maxPercent = ((props.maxValue - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100

  const updateFromTouch = (event: any, mode: 'nearest' | 'active' = 'active') => {
    const pageX = getTouchPageX(event)
    if (!pageX) return
    Taro.createSelectorQuery()
      .select(`#${trackIdRef.current}`)
      .boundingClientRect((rect: any) => {
        const width = Number(rect?.width || 0)
        if (!width) return
        const ratio = Math.max(0, Math.min(1, (pageX - Number(rect.left || 0)) / width))
        const nextValue = clampAge(AGE_RANGE_MIN + ratio * (AGE_RANGE_MAX - AGE_RANGE_MIN))
        if (mode === 'nearest') {
          activeHandleRef.current = Math.abs(nextValue - props.minValue) <= Math.abs(nextValue - props.maxValue) ? 'min' : 'max'
        }
        if (activeHandleRef.current === 'min') props.onChange(Math.min(nextValue, props.maxValue), props.maxValue)
        else props.onChange(props.minValue, Math.max(nextValue, props.minValue))
      })
      .exec()
  }

  const startHandle = (handle: 'min' | 'max', event: any) => {
    event?.stopPropagation?.()
    activeHandleRef.current = handle
    updateFromTouch(event)
  }

  return (
    <View style={{ marginTop: space(2), marginBottom: space(4) }}>
      <View style={{ marginBottom: space(2) }}>
        <Text style={{ ...typography.caption, color: palette.subtext }}>{formatAgeRange(props.minValue, props.maxValue)}</Text>
      </View>
      <View
        id={trackIdRef.current}
        onTouchStart={(event: any) => updateFromTouch(event, 'nearest')}
        onTouchMove={(event: any) => updateFromTouch(event)}
        style={{ position: 'relative', height: '44px', margin: `0 ${space(3)}` }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: '20px', height: '4px', borderRadius: radius.pill, backgroundColor: palette.line }} />
        <View style={{ position: 'absolute', left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%`, top: '20px', height: '4px', borderRadius: radius.pill, backgroundColor: palette.accentDeep }} />
        <View onTouchStart={(event: any) => startHandle('min', event)} onTouchMove={(event: any) => updateFromTouch(event)} style={{ position: 'absolute', left: `${minPercent}%`, top: '10px', width: '24px', height: '24px', marginLeft: '-12px', borderRadius: radius.pill, backgroundColor: palette.accentDeep, boxShadow: '0 4px 12px rgba(112, 56, 46, 0.22)' }} />
        <View onTouchStart={(event: any) => startHandle('max', event)} onTouchMove={(event: any) => updateFromTouch(event)} style={{ position: 'absolute', left: `${maxPercent}%`, top: '10px', width: '24px', height: '24px', marginLeft: '-12px', borderRadius: radius.pill, backgroundColor: palette.accentDeep, boxShadow: '0 4px 12px rgba(112, 56, 46, 0.22)' }} />
      </View>
    </View>
  )
}

function getLocations(item: School): SchoolLocationItem[] {
  if (Array.isArray(item.locations) && item.locations.length > 0) return item.locations
  return splitTokens(item.city).map((city, index) => ({
    school_id: Number(item.id),
    province: splitTokens(item.province)[index] || splitTokens(item.province)[0] || '',
    city,
    status: 'legacy',
  }))
}

function formatLocation(location: SchoolLocationItem) {
  return [location.province, location.city].filter(Boolean).join(' · ') || '地点未填写'
}

function getLocationSummary(item: School) {
  const locations = getLocations(item)
  if (locations.length === 0) return [item.province, item.city].filter(Boolean).join(' ') || '未知地点'
  const first = formatLocation(locations[0])
  return locations.length > 1 ? `${first} 等 ${locations.length} 个地点` : first
}

function getLocationHaystack(item: School) {
  return getLocations(item).map(formatLocation).join(' ')
}

function schoolMatchesProvince(item: School, selectedProvinces: string[]) {
  if (selectedProvinces.length === 0) return true
  return getLocations(item).some((location) => selectedProvinces.includes(location.province || ''))
}

function schoolMatchesType(item: School, selectedTypes: string[]) {
  if (selectedTypes.length === 0) return true
  const labels = schoolTypeLabels(item.school_type)
  return selectedTypes.some((type) => labels.includes(type))
}

function toggleMultiFilter(current: string[], option: string, allOption: string) {
  if (option === allOption) return []
  if (current.includes(option)) return current.filter((item) => item !== option)
  return [...current, option]
}

function isMultiActive(current: string[], option: string, allOption: string) {
  return option === allOption ? current.length === 0 : current.includes(option)
}

function formatSelectedSummary(values: string[], label: string) {
  if (values.length === 0) return ''
  return `${label}${values.length}项`
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [filterSourceSchools, setFilterSourceSchools] = useState<School[]>([])
  const [filterSettings, setFilterSettings] = useState<AppFilterOptions['school']>(SCHOOL_FILTER_FALLBACKS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [ageRangeMin, setAgeRangeMin] = useState(AGE_RANGE_MIN)
  const [ageRangeMax, setAgeRangeMax] = useState(AGE_RANGE_MAX)
  const didInitRef = useRef(false)
  const allFilter = filterSettings.allOption || SCHOOL_FILTER_FALLBACKS.allOption
  const listLimit = Number(filterSettings.listLimit || SCHOOL_FILTER_FALLBACKS.listLimit)
  const maxDynamicOptions = Number(filterSettings.maxDynamicOptions || SCHOOL_FILTER_FALLBACKS.maxDynamicOptions)
  const ageFilterActive = ageRangeMin > AGE_RANGE_MIN || ageRangeMax < AGE_RANGE_MAX

  useShareAppMessage(() => SCHOOL_SHARE.appMessage)
  useShareTimeline(() => SCHOOL_SHARE.timeline)

  useEffect(() => {
    getFilterOptions().then((options) => setFilterSettings(options.school)).catch((err) => {
      console.warn('load school filter options skipped:', err)
    })
  }, [])

  const hasActiveFilters = () => selectedProvinces.length > 0 || selectedTypes.length > 0 || ageFilterActive

  const loadSchools = async (options: { forceRefresh?: boolean; useFilters?: boolean; syncFilterSource?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const useFilters = options.useFilters !== false
      const result = await getSchools({
        forceRefresh: !!options.forceRefresh,
        limit: listLimit,
        ...(useFilters && selectedProvinces.length > 0 ? { province: selectedProvinces } : {}),
      })
      const nextSchools = Array.isArray(result.schools) ? result.schools : []
      setSchools(nextSchools)
      if (options.syncFilterSource) setFilterSourceSchools(nextSchools)
      if (!result?.ok && nextSchools.length === 0) setError(result?.message || '读取学习社区数据失败')
      return nextSchools
    } catch (err: any) {
      console.error('loadSchools error:', err)
      setError(err?.message || '读取学习社区数据失败')
      Taro.showToast({ title: '学习社区数据读取失败', icon: 'none' })
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadFilterOptions = async (forceRefresh = false) => {
    const [options, result] = await Promise.all([
      getFilterOptions({ forceRefresh }),
      getSchools({ forceRefresh, limit: listLimit }),
    ])
    setFilterSettings(options.school)
    const list = Array.isArray(result.schools) ? result.schools : []
    setFilterSourceSchools(list)
    return list
  }

  useDidShow(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    loadSchools({ useFilters: false, syncFilterSource: true }).catch((err) => {
      console.error('load schools page init error:', err)
    })
  })

  useEffect(() => {
    if (!didInitRef.current) return
    loadSchools({ useFilters: hasActiveFilters(), syncFilterSource: !hasActiveFilters() })
  }, [selectedProvinces, selectedTypes, ageRangeMin, ageRangeMax])

  usePullDownRefresh(async () => {
    if (hasActiveFilters()) {
      await Promise.all([
        loadFilterOptions(true),
        loadSchools({ forceRefresh: true, useFilters: true }),
      ])
    } else {
      await loadSchools({ forceRefresh: true, useFilters: false, syncFilterSource: true })
      await getFilterOptions({ forceRefresh: true }).then((options) => setFilterSettings(options.school)).catch(() => null)
    }
    Taro.stopPullDownRefresh()
  })

  const optionSource = filterSourceSchools.length > 0 ? filterSourceSchools : schools
  const provinceCounts = useMemo(() => buildOptionCountMap(optionSource, (item) => getLocations(item).map((location) => location.province || '')), [optionSource])
  const typeCounts = useMemo(() => buildOptionCountMap(optionSource, (item) => schoolTypeLabels(item.school_type)), [optionSource])
  const normalizedTypeSettings = useMemo(() => normalizeTypeOptions(filterSettings.schoolTypes || []), [filterSettings.schoolTypes])
  const provinceOptions = useMemo(() => countedOptions(allFilter, filterSettings.provinces || [], provinceCounts, maxDynamicOptions), [allFilter, maxDynamicOptions, filterSettings.provinces, provinceCounts])
  const typeOptions = useMemo(() => countedOptions(allFilter, normalizedTypeSettings, typeCounts, maxDynamicOptions), [allFilter, maxDynamicOptions, normalizedTypeSettings, typeCounts])

  const filteredSchools = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return schools.filter((item) => {
      const displayAgeRange = formatAgeRangeForDisplay(item.age_range)
      const haystack = [item.name, item.canonical_name, item.province, item.city, getLocationHaystack(item), item.school_type, item.age_range, displayAgeRange, item.fee]
        .filter(Boolean).join(' ').toLowerCase()
      if (q && !haystack.includes(q)) return false
      if (!schoolMatchesProvince(item, selectedProvinces)) return false
      if (!schoolMatchesType(item, selectedTypes)) return false
      if (!schoolMatchesAgeRange(item.age_range, ageRangeMin, ageRangeMax)) return false
      return true
    })
  }, [schools, keyword, selectedProvinces, selectedTypes, ageRangeMin, ageRangeMax])

  const activeFilterSummary = [
    formatSelectedSummary(selectedProvinces, '地区'),
    formatSelectedSummary(selectedTypes, '类型'),
    ageFilterActive ? `年龄${formatAgeRange(ageRangeMin, ageRangeMax)}` : '',
  ].filter(Boolean).join(' · ')

  const resetFilters = () => {
    setKeyword('')
    setSelectedProvinces([])
    setSelectedTypes([])
    setAgeRangeMin(AGE_RANGE_MIN)
    setAgeRangeMax(AGE_RANGE_MAX)
  }

  const goToDetail = (item: School) => {
    setDetailPreview('school', item.id, item)
    Taro.navigateTo({ url: `/pages/school-detail/index?id=${item.id}` })
  }

  const goToSubmit = () => {
    Taro.navigateTo({ url: '/pkg/schools/submit/index' })
  }

  return (
    <AppPage>
      <AppPageHeader
        title='学习社区库'
        description='搜索、筛选、查看学习社区详情，也可以提交新的社区推荐，进入人工审核队列。'
        action={<AppMiniButton text='推荐新学习社区' onClick={goToSubmit} />}
      />

      <AppCard>
        <AppSearchBox
          value={keyword}
          placeholder='搜索已收录社区，找不到可提交推荐'
          helperText='找不到时可先调整筛选，或推荐新的学习社区。'
          onInput={setKeyword}
        />
      </AppCard>

      <AppCard padding={space(3)}>
        <View className='app-filter-panel__heading'>
          <View className='app-flex-1'>
            <Text className='text-body-strong text-color-main'>筛选</Text>
            {!!activeFilterSummary && (
              <View className='app-filter-panel__summary'>
                <Text className='text-micro text-color-sub'>{activeFilterSummary}</Text>
              </View>
            )}
          </View>
          <Text onClick={resetFilters} className='text-caption text-color-link'>重置</Text>
        </View>

        <AppFilterRow title='地区'>
          {provinceOptions.map((option) => (
            <FilterChip key={option} label={option} active={isMultiActive(selectedProvinces, option, allFilter)} onClick={() => setSelectedProvinces((current) => toggleMultiFilter(current, option, allFilter))} />
          ))}
        </AppFilterRow>
        <AppFilterRow title='类型'>
          {typeOptions.map((option) => (
            <FilterChip key={option} label={option} active={isMultiActive(selectedTypes, option, allFilter)} onClick={() => setSelectedTypes((current) => toggleMultiFilter(current, option, allFilter))} />
          ))}
        </AppFilterRow>
        <View style={{ marginBottom: space(4) }}>
          <Text style={{ ...typography.bodyStrong, color: palette.brand }}>年龄区间</Text>
          <AgeRangeSlider minValue={ageRangeMin} maxValue={ageRangeMax} onChange={(minValue, maxValue) => { setAgeRangeMin(minValue); setAgeRangeMax(maxValue) }} />
        </View>
      </AppCard>

      <View className='app-count-line'>
        <Text className='text-meta text-color-muted'>{loading ? '加载中...' : `共 ${filteredSchools.length} / ${schools.length} 个学习社区`}</Text>
      </View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}
      {error ? <ErrorRetryCard error={error} onRetry={() => loadSchools({ forceRefresh: true, useFilters: hasActiveFilters(), syncFilterSource: !hasActiveFilters() })} /> : null}
      {!loading && filteredSchools.length === 0 ? <EmptyCard text='没有匹配结果。可以先重置筛选，或把你知道的学习社区推荐进来。' actionText='重置筛选' onAction={resetFilters} /> : null}

      {!loading && filteredSchools.map((item, index) => {
        const iconBgRotation = [palette.iconBg, palette.brandSoft, palette.accent2Soft, palette.greenSoft]
        const iconBg = iconBgRotation[index % iconBgRotation.length]
        const locationCount = getLocations(item).length
        const displayAgeRange = formatAgeRangeForDisplay(item.age_range)

        return (
          <AppCard key={item.id} onClick={() => goToDetail(item)}>
            <View className='app-list-card__header'>
              <View className='app-list-card__icon'>
                <AppIcon name='school' size={42} backgroundColor={iconBg} bordered />
              </View>
              <View className='app-flex-1'>
                <Text className='text-card-title text-color-main'>{item.canonical_name || item.name}</Text>
              </View>
            </View>

            <View className='app-list-card__tags'>
              <AppTag text={getLocationSummary(item)} />
              {locationCount > 1 ? <AppTag text={`${locationCount} 个地点`} tone='brand' /> : null}
              <AppTag text={item.school_type || '未填写'} />
            </View>

            <View className='app-list-card__meta-box'>
              <View className='app-list-card__meta-line'>
                <Text className='text-meta text-color-sub'>适合年龄段：{displayAgeRange || '未填写'}</Text>
              </View>
              <View className='app-list-card__meta-line'>
                <Text className='text-meta text-color-sub'>费用：{item.fee || '未填写'}</Text>
              </View>
            </View>
          </AppCard>
        )
      })}
    </AppPage>
  )
}
