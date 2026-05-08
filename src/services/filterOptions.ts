import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import { EVENT_FILTER_FALLBACKS, SCHOOL_FILTER_FALLBACKS, type EventFilterOptions, type SchoolFilterOptions } from '../constants/filterOptions'
import type { CloudResponse } from '../types/domain'

const FILTER_OPTIONS_CACHE_KEY = 'cloud-cache:filter-options:v1'
const FILTER_OPTIONS_TTL_MS = 24 * 60 * 60 * 1000

type FilterOptionsPayload = {
  event?: Partial<EventFilterOptions>
  school?: Partial<SchoolFilterOptions>
}

type FilterOptionsResult = CloudResponse<FilterOptionsPayload>

export type AppFilterOptions = {
  event: EventFilterOptions
  school: SchoolFilterOptions
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
    },
  }
}

export async function getFilterOptions(options: { forceRefresh?: boolean } = {}): Promise<AppFilterOptions> {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<FilterOptionsPayload>(FILTER_OPTIONS_CACHE_KEY)
  if (cached) return mergeFilterOptions(cached)

  const result = await callCloud<FilterOptionsResult>('getFilterOptions')
  if (result.ok) {
    const payload = { event: result.event || {}, school: result.school || {} }
    await setScopedCachedValue(FILTER_OPTIONS_CACHE_KEY, payload, FILTER_OPTIONS_TTL_MS)
    return mergeFilterOptions(payload)
  }

  return mergeFilterOptions(null)
}
