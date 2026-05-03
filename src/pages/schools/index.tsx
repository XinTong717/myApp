import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { getSchools } from '../../services/school'
import { setDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppIcon from '../../components/common/AppIcon'
import AppChip from '../../components/common/AppChip'
import { EmptyCard, ErrorRetryCard } from '../../components/common/StateCards'
import { ListSkeleton } from '../../components/common/Skeleton'
import type { SchoolItem, SchoolLocationItem } from '../../types/domain'

const ALL_FILTER = '全部'
const SCHOOL_LIST_LIMIT = 200
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

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='brand' size='md' selected={props.active} interactive onClick={props.onClick} />
}

function splitTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueValues(values: string[], max = 16) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, max)
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

function toggleMultiFilter(current: string[], option: string) {
  if (option === ALL_FILTER) return []
  if (current.includes(option)) return current.filter((item) => item !== option)
  return [...current, option]
}

function isMultiActive(current: string[], option: string) {
  return option === ALL_FILTER ? current.length === 0 : current.includes(option)
}

function formatSelectedSummary(values: string[], label: string) {
  if (values.length === 0) return ''
  return `${label}${values.length}项`
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [filterSourceSchools, setFilterSourceSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([])
  const didInitRef = useRef(false)

  useShareAppMessage(() => SCHOOL_SHARE.appMessage)
  useShareTimeline(() => SCHOOL_SHARE.timeline)

  const hasActiveFilters = () => selectedProvinces.length > 0 || selectedTypes.length > 0 || selectedAgeRanges.length > 0

  const loadSchools = async (options: { forceRefresh?: boolean; useFilters?: boolean; syncFilterSource?: boolean } = {}) => {
    try {
      setLoading(true)
      setError('')
      const useFilters = options.useFilters !== false
      const result = await getSchools({
        forceRefresh: !!options.forceRefresh,
        limit: SCHOOL_LIST_LIMIT,
        ...(useFilters && selectedProvinces.length > 0 ? { province: selectedProvinces } : {}),
        ...(useFilters && selectedTypes.length > 0 ? { schoolType: selectedTypes } : {}),
        ...(useFilters && selectedAgeRanges.length > 0 ? { ageRange: selectedAgeRanges } : {}),
      })
      const nextSchools = Array.isArray(result.schools) ? result.schools : []
      setSchools(nextSchools)
      if (options.syncFilterSource) {
        setFilterSourceSchools(nextSchools)
      }
      if (!result?.ok && nextSchools.length === 0) {
        setError(result?.message || '读取学习社区数据失败')
      }
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
    const result = await getSchools({ forceRefresh, limit: SCHOOL_LIST_LIMIT })
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
    }
    Taro.stopPullDownRefresh()
  })

  const optionSource = filterSourceSchools.length > 0 ? filterSourceSchools : schools

  const provinceOptions = useMemo(() => {
    return [ALL_FILTER, ...uniqueValues(optionSource.flatMap((item) => getLocations(item).map((location) => location.province || '')))]
  }, [optionSource])
  const typeOptions = useMemo(() => [ALL_FILTER, ...uniqueValues(optionSource.flatMap((item) => splitTokens(item.school_type)))], [optionSource])
  const ageOptions = useMemo(() => [ALL_FILTER, ...uniqueValues(optionSource.flatMap((item) => splitTokens(item.age_range)))], [optionSource])

  const filteredSchools = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return schools.filter((item) => {
      const haystack = [item.name, item.canonical_name, item.province, item.city, getLocationHaystack(item), item.school_type, item.age_range, item.fee]
        .filter(Boolean).join(' ').toLowerCase()
      if (q && !haystack.includes(q)) return false
      return true
    })
  }, [schools, keyword])

  const activeFilterSummary = [
    formatSelectedSummary(selectedProvinces, '地区'),
    formatSelectedSummary(selectedTypes, '类型'),
    formatSelectedSummary(selectedAgeRanges, '阶段'),
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
    <View style={{
      padding: space(4), backgroundColor: palette.bg,
      minHeight: '100vh', boxSizing: 'border-box',
    }}>
      <AppCard padding={`18px ${space(4)}`}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(2) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.title, color: palette.text }}>学习社区库</Text>
          </View>
          <View onClick={goToSubmit} style={{
            padding: `7px ${space(3)}`, borderRadius: '999px', background: palette.primaryGradient,
          }}>
            <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700' }}>推荐新学习社区</Text>
          </View>
        </View>
        <Text style={{ ...typography.meta, color: palette.subtext }}>
          搜索、筛选、查看学习社区详情，也可以提交新的社区推荐，进入人工审核队列。
        </Text>
        <View style={{
          backgroundColor: palette.surface, borderRadius: '16px',
          padding: `10px ${space(3)}`, marginTop: '14px', border: `1px solid ${palette.line}`,
        }}>
          <Input
            type='text'
            value={keyword}
            placeholder={`搜索当前已加载的前 ${SCHOOL_LIST_LIMIT} 条结果`}
            placeholderStyle={`color:${palette.muted}`}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ ...typography.micro, color: palette.muted }}>
            搜索仅覆盖当前结果；找不到时可先调整筛选，或推荐新的学习社区。
          </Text>
        </View>
      </AppCard>

      <AppCard padding={space(3)} radius='18px'>
        <View style={{ marginBottom: space(2), display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.meta, fontWeight: '700', color: palette.text }}>筛选</Text>
            {!!activeFilterSummary && (
              <View style={{ marginTop: space(1) }}>
                <Text style={{ ...typography.micro, color: palette.subtext }}>{activeFilterSummary}</Text>
              </View>
            )}
          </View>
          <Text onClick={resetFilters} style={{ ...typography.caption, color: palette.link }}>重置</Text>
        </View>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap', marginBottom: '6px' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {provinceOptions.map((option) => (
              <FilterChip key={option} label={option} active={isMultiActive(selectedProvinces, option)} onClick={() => setSelectedProvinces((current) => toggleMultiFilter(current, option))} />
            ))}
          </View>
        </ScrollView>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap', marginBottom: '6px' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {typeOptions.map((option) => (
              <FilterChip key={option} label={option} active={isMultiActive(selectedTypes, option)} onClick={() => setSelectedTypes((current) => toggleMultiFilter(current, option))} />
            ))}
          </View>
        </ScrollView>

        <ScrollView scrollX style={{ whiteSpace: 'nowrap' }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {ageOptions.map((option) => (
              <FilterChip key={option} label={option} active={isMultiActive(selectedAgeRanges, option)} onClick={() => setSelectedAgeRanges((current) => toggleMultiFilter(current, option))} />
            ))}
          </View>
        </ScrollView>
      </AppCard>

      <View style={{ marginBottom: '14px' }}>
        <Text style={{ ...typography.meta, color: palette.muted }}>
          {loading ? '加载中...' : `共 ${filteredSchools.length} / ${schools.length} 个学习社区`}
        </Text>
      </View>

      {loading ? <ListSkeleton count={3} rows={3} /> : null}

      {error ? (
        <ErrorRetryCard
          error={error}
          onRetry={() => loadSchools({ forceRefresh: true, useFilters: hasActiveFilters(), syncFilterSource: !hasActiveFilters() })}
        />
      ) : null}

      {!loading && filteredSchools.length === 0 ? (
        <EmptyCard
          text='没有匹配结果。可以先重置筛选，或把你知道的学习社区推荐进来。'
          actionText='重置筛选'
          onAction={resetFilters}
        />
      ) : null}

      {!loading && filteredSchools.map((item, index) => {
        const iconBgRotation = [palette.iconBg, palette.brandSoft, palette.accent2Soft, palette.greenSoft]
        const iconBg = iconBgRotation[index % iconBgRotation.length]
        const locationCount = getLocations(item).length

        return (
          <AppCard key={item.id} onClick={() => goToDetail(item)}>
            <View style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '10px',
            }}>
              <View style={{ marginRight: '10px' }}>
                <AppIcon name='school' size={38} backgroundColor={iconBg} bordered />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.cardTitle, color: palette.text }}>
                  {item.canonical_name || item.name}
                </Text>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '10px' }}>
              <AppTag text={getLocationSummary(item)} />
              {locationCount > 1 ? <AppTag text={`${locationCount} 个地点`} tone='brand' /> : null}
              <AppTag text={item.school_type || '未填写'} />
            </View>

            <View style={{
              backgroundColor: palette.surface, borderRadius: '16px',
              padding: space(3), marginBottom: '10px', border: `1px solid ${palette.line}`,
            }}>
              <View style={{ marginBottom: '6px' }}>
                <Text style={{ ...typography.meta, color: palette.subtext }}>
                  适合阶段：{item.age_range || '未填写'}
                </Text>
              </View>
              <View>
                <Text style={{ ...typography.meta, color: palette.subtext }}>
                  费用：{item.fee || '未填写'}
                </Text>
              </View>
            </View>

            <Text style={{ ...typography.meta, color: palette.link, fontWeight: '700' }}>
              查看详情 ›
            </Text>
          </AppCard>
        )
      })}
    </View>
  )
}
