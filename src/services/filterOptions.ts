import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import {
  BOARDING_TYPE_OPTIONS,
  EVENT_FILTER_FALLBACKS,
  SCHOOL_FILTER_FALLBACKS,
  SCHOOL_TYPE_OPTIONS,
  type EventFilterOptions,
  type SchoolFilterOptions,
} from '../constants/filterOptions'

const FILTER_OPTIONS_CACHE_KEY = 'cloud-cache:filter-options:v6'
const FILTER_OPTIONS_TTL_MS = 24 * 60 * 60 * 1000

type FilterOptionsPayload = {
  event?: Partial<EventFilterOptions>
  school?: Partial<SchoolFilterOptions>
}

export type AppFilterOptions = {
  event: EventFilterOptions
  school: SchoolFilterOptions
}

function normalizeList(value?: string[] | readonly string[]) {
  return Array.from(new Set((value || []).map((item) => String(item || '').trim()).filter(Boolean)))
}

function mergeCanonicalOptions(remote?: string[] | readonly string[], canonical?: string[] | readonly string[]) {
  const canonicalList = normalizeList(canonical)
  const remoteExtra = normalizeList(remote).filter((item) => !canonicalList.includes(item))
  return [...canonicalList, ...remoteExtra]
}

function mergeFilterOptions(payload?: FilterOptionsPayload | null): AppFilterOptions {
  const remoteSchool = payload?.school || {}
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
      ...remoteSchool,
      schoolTypes: mergeCanonicalOptions(remoteSchool.schoolTypes, SCHOOL_TYPE_OPTIONS),
      boardingTypes: mergeCanonicalOptions(remoteSchool.boardingTypes, BOARDING_TYPE_OPTIONS),
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
