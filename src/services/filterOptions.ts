import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import { EVENT_FILTER_FALLBACKS, SCHOOL_FILTER_FALLBACKS, type EventFilterOptions, type SchoolFilterOptions } from '../constants/filterOptions'

const FILTER_OPTIONS_CACHE_KEY = 'cloud-cache:filter-options:v4'
const FILTER_OPTIONS_TTL_MS = 24 * 60 * 60 * 1000

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

function mergeFilterOptions(payload?: FilterOptionsPayload | null): AppFilterOptions {
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
      provinces: mergeOptionList(payload?.school?.provinces, SCHOOL_FILTER_FALLBACKS.provinces),
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
