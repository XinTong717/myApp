import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getSchools } from '../../services/school'
import { getFilterOptions, type AppFilterOptions } from '../../services/filterOptions'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
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

type School = SchoolItem

type AgeBucket = {
  label: string
  min: number
  max: number
  keywords?: string[]
}

const AGE_BUCKETS: AgeBucket[] = [
  { label: '0-6', min: 0, max: 6, keywords: ['学龄前', '幼儿', '幼小'] },
  { label: '7-12', min: 7, max: 12, keywords: ['小学', '儿童'] },
  { label: '13-15', min: 13, max: 15, keywords: ['初中', '中学', '青少年'] },
  { label: '16-18', min: 16, max: 18, keywords: ['高中', '中学', '青少年'] },
  { label: '19-24', min: 19, max: 24, keywords: ['大学', '青年', '成人'] },
  { label: '25+', min: 25, max: Number.POSITIVE_INFINITY, keywords: ['成人'] },
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

function orderedAgeOptions(allOption: string, counts: Map<string, Set<string>>, max: number) {
  const options = AGE_BUCKETS
    .map((item) => item.label)
    .filter((label) => optionCount(counts, label) > 0)
    .slice(0, max)
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
  const rangePattern = /(\d{1,2})\s*(?:岁)?\s*-\s*(\d{1,2})/g
  let rangeMatch: RegExpExecArray | null
  while ((rangeMatch = rangePattern.exec(text))) {
    const a = Number(rangeMatch[1])
    const b = Number(rangeMatch[2])
    if (Number.isFinite(a) && Number.isFinite(b)) spans.push({ min: Math.min(a, b), max: Math.max(a, b) })
  }

  const plusPattern = /(\d{1,2})\s*(?:岁)?\s*(?:\+|以上|及以上)/g
  let plusMatch: RegExpExecArray | null
  while ((plusMatch = plusPattern.exec(text))) {
    const min = Number(plusMatch[1])
    if (Number.isFinite(min)) spans.push({ min, max: Number.POSITIVE_INFINITY })
  }

  const underPattern = /(\d{1,2})\s*(?:岁)?\s*(?:以下|以内|以下儿童)/g
  let underMatch: RegExpExecArray | null
  while ((underMatch = underPattern.exec(text))) {
    const max = Number(underMatch[1])
    if (Number.isFinite(max)) spans.push({ min: 0, max })
  }

  if (spans.length > 0) return spans

  return AGE_BUCKETS
    .filter((bucket) => (bucket.keywords || []).some((keyword) => text.includes(keyword)))
    .map((bucket) => ({ min: bucket.min, max: bucket.max }))
}

function rangesOverlap(a: { min: number; max: number }, b: { min: number; max: number }) {
  return Math.max(a.min, b.min) <= Math.min(a.max, b.max)
}

function ageRangeMatchesBucket(value: string | undefined, bucketLabel: string) {
  const bucket = AGE_BUCKETS.find((item) => item.label === bucketLabel)
  if (!bucket) return false
  const spans = getAgeSpans(value)
  return spans.some((span) => rangesOverlap(span, bucket))
}

function ageBucketLabels(value?: string) {
  return AGE_BUCKETS.filter((bucket) => ageRangeMatchesBucket(value, bucket.label)).map((bucket) => bucket.label)
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
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([])
  const didInitRef = useRef(false)
  const allFilter = filterSettings.allOption || SCHOOL_FILTER_FALLBACKS.allOption
  const listLimit = Number(filterSettings.listLimit || SCHOOL_FILTER_FALLBACKS.listLimit)
  const maxDynamicOptions = Number(filterSettings.maxDynamicOptions || SCHOOL_FILTER_FALLBACKS.maxDynamicOptions)

  useShareAppMessage(() => SCHOOL_SHARE.appMessage)
  useShareTimeline(() => SCHOOL_SHARE.timeline)

  useEffect(() => {
    getFilterOptions().then((options) => setFilterSettings(options.school)).catch((err) => {
      console.warn('load school filter options skipped:', err)
    })
  }, [])

  const hasActiveFilters = () => selectedProvinces.length > 0 || selectedTypes.length > 0 || selectedAgeRanges.length > 0

  const loadSchools = async (options: { forceRefresh?: boolean; useFilters?: boolean; syncFilterSource?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const useFilters = options.useFilters !== false
      const result = await getSchools({
        forceRefresh: !!options.forceRefresh,
        limit: listLimit,
        ...(useFilters && selectedProvinces.length > 0 ? { province: selectedProvinces } : {}),
        ...(useFilters && selectedTypes.length > 0 ? { schoolType: selectedTypes } : {}),
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
  }, [selectedProvinces, selectedTypes, selectedAgeRanges])

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
  const typeCounts = useMemo(() => buildOptionCountMap(optionSource, (item) => splitTokens(item.school_type)), [optionSource])
  const ageCounts = useMemo(() => buildOptionCountMap(optionSource, (item) => ageBucketLabels(item.age_range)), [optionSource])
  const provinceOptions = useMemo(() => countedOptions(allFilter, filterSettings.provinces || [], provinceCounts, maxDynamicOptions), [allFilter, maxDynamicOptions, filterSettings.provinces, provinceCounts])
  const typeOptions = useMemo(() => countedOptions(allFilter, filterSettings.schoolTypes || [], typeCounts, maxDynamicOptions), [allFilter, maxDynamicOptions, filterSettings.schoolTypes, typeCounts])
  const ageOptions = useMemo(() => orderedAgeOptions(allFilter, ageCounts, maxDynamicOptions), [allFilter, maxDynamicOptions, ageCounts])

  const filteredSchools = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return schools.filter((item) => {
      const haystack = [item.name, item.canonical_name, item.province, item.city, getLocationHaystack(item), item.school_type, item.age_range, item.fee]
        .filter(Boolean).join(' ').toLowerCase()
      if (q && !haystack.includes(q)) return false
      if (selectedAgeRanges.length > 0 && !selectedAgeRanges.some((ageRange) => ageRangeMatchesBucket(item.age_range, ageRange))) return false
      return true
    })
  }, [schools, keyword, selectedAgeRanges])

  const activeFilterSummary = [
    formatSelectedSummary(selectedProvinces, '地区'),
    formatSelectedSummary(selectedTypes, '类型'),
    formatSelectedSummary(selectedAgeRanges, '年龄段'),
  ].filter(Boolean).join(' · ')

  const resetFilters = () => {
    setKeyword('')
    setSelectedProvinces([])
    setSelectedTypes([])
    setSelectedAgeRanges([])
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
        <AppFilterRow title='年龄段'>
          {ageOptions.map((option) => (
            <FilterChip key={option} label={option} active={isMultiActive(selectedAgeRanges, option, allFilter)} onClick={() => setSelectedAgeRanges((current) => toggleMultiFilter(current, option, allFilter))} />
          ))}
        </AppFilterRow>
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
                <Text className='text-meta text-color-sub'>适合年龄段：{item.age_range || '未填写'}</Text>
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
