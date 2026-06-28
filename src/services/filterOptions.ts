import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import { EVENT_FILTER_FALLBACKS, SCHOOL_FILTER_FALLBACKS } from '../constants/filterOptions'

const FILTER_OPTIONS_CACHE_KEY = 'cloud-cache:filter-options:v6'
const FILTER_OPTIONS_TTL_MS = 24 * 60 * 60 * 1000

type EventFilterOptions = typeof EVENT_FILTER_FALLBACKS
type SchoolFilterOptions = typeof SCHOOL_FILTER_FALLBACKS
type SchoolProvinceStat = SchoolFilterOptions['provinceStats'][number]

type FilterOptionsPayload = {
  event?: Partial<EventFilterOptions>
  school?: Partial<SchoolFilterOptions>
}

export type AppFilterOptions = {
  event: EventFilterOptions
  school: SchoolFilterOptions
}

function mergeOptionList(preferred?: string[], fallback: string[] = []) {
  return Array.from(new Set([...(preferred || []), ...fallback].filter(Boolean)))
}

function normalizeProvinceStats(value?: SchoolProvinceStat[]) {
  const countMap = new Map<string, number>()
  ;(Array.isArray(value) ? value : []).forEach((item) => {
    const province = String(item?.province || '').trim()
    const count = Number(item?.count || 0)
    if (!province || !Number.isFinite(count) || count <= 0) return
    countMap.set(province, (countMap.get(province) || 0) + count)
  })
  return Array.from(countMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count || a.province.localeCompare(b.province, 'zh-CN'))
}

function mergeFilterOptions(payload?: FilterOptionsPayload | null): AppFilterOptions {
  const provinceStats = normalizeProvinceStats(payload?.school?.provinceStats)
  return {
    event: {
      ...EVENT_FILTER_FALLBACKS,
      ...(payload?.event || {}),
      eventTypeValueMap: {
        ...EVENT_FILTER_FALLBACKS.eventTypeValueMap,
        ...(payload?.event?.eventTypeValueMap || {}),
      },
    },
    school: {
      ...SCHOOL_FILTER_FALLBACKS,
      ...(payload?.school || {}),
      provinces: mergeOptionList(payload?.school?.provinces, provinceStats.map((item) => item.province).concat(SCHOOL_FILTER_FALLBACKS.provinces)),
      provinceStats,
      schoolTypes: mergeOptionList(payload?.school?.schoolTypes, SCHOOL_FILTER_FALLBACKS.schoolTypes),
      ageRanges: mergeOptionList(payload?.school?.ageRanges, SCHOOL_FILTER_FALLBACKS.ageRanges),
    },
  }
}

export async function getFilterOptions(options: { forceRefresh?: boolean } = {}): Promise<AppFilterOptions> {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<FilterOptionsPayload>(FILTER_OPTIONS_CACHE_KEY)
  if (cached) return mergeFilterOptions(cached)

  const result = await callCloud<FilterOptionsPayload>('getFilterOptions')
  if (result.ok) {
    const payload = { event: result.event || {}, school: result.school || {} }
    await setScopedCachedValue(FILTER_OPTIONS_CACHE_KEY, payload, FILTER_OPTIONS_TTL_MS)
    return mergeFilterOptions(payload)
  }

  return mergeFilterOptions(null)
}
