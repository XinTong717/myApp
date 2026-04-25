import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import type {
  CloudResponse,
  ContactInfoResult,
  EventDetailResult,
  EventInterestCountsBatchResult,
  EventInterestInfoResult,
  EventListResult,
  ToggleEventInterestResult,
} from '../types/domain'

const EVENT_LIST_CACHE_KEY = 'cloud-cache:events:list:v2'
const EVENT_LIST_LEGACY_CACHE_KEY = 'cloud-cache:events:list:v1'
const EVENT_LIST_TTL_MS = 5 * 60 * 1000

async function readAnyEventListCache() {
  return (
    await getScopedCachedValue<EventListResult>(EVENT_LIST_CACHE_KEY)
  ) || (
    await getScopedCachedValue<EventListResult>(EVENT_LIST_LEGACY_CACHE_KEY)
  )
}

export async function clearEventListCache() {
  await Promise.all([
    clearScopedCachedValue(EVENT_LIST_CACHE_KEY),
    clearScopedCachedValue(EVENT_LIST_LEGACY_CACHE_KEY),
  ])
}

export async function getEvents(options: { forceRefresh?: boolean; includeInterestCounts?: boolean } = {}) {
  const includeInterestCounts = options.includeInterestCounts !== false
  const cached = options.forceRefresh ? null : await readAnyEventListCache()
  if (cached) {
    return cached
  }

  const result = await callCloud<EventListResult>('getEvents', { includeInterestCounts })
  if (result.ok) {
    await setScopedCachedValue(EVENT_LIST_CACHE_KEY, result, EVENT_LIST_TTL_MS)
    return result
  }

  if (includeInterestCounts) {
    const fallbackResult = await callCloud<EventListResult>('getEvents', { includeInterestCounts: false })
    if (fallbackResult.ok) {
      const events = Array.isArray(fallbackResult.events)
        ? fallbackResult.events.map((item) => ({ ...item, interest_count: item.interest_count || 0 }))
        : []
      const degradedResult = {
        ...fallbackResult,
        ok: true,
        events,
        degraded: true,
        code: result.code,
        message: result.message,
      }
      await setScopedCachedValue(EVENT_LIST_CACHE_KEY, degradedResult, EVENT_LIST_TTL_MS)
      return degradedResult
    }
  }

  const staleCached = await readAnyEventListCache()
  if (staleCached) {
    return {
      ...staleCached,
      ok: true,
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function getEventDetail(eventId: number) {
  return callCloud<EventDetailResult>('getEventDetail', { eventId })
}

export async function getEventInterestCountsBatch(eventIds: number[]) {
  return callCloud<EventInterestCountsBatchResult>('getEventInterestCountsBatch', { eventIds })
}

export async function getEventInterestInfo(eventId: number) {
  return callCloud<EventInterestInfoResult>('getEventInterestInfo', { eventId })
}

export async function toggleEventInterest(eventId: number) {
  return callCloud<ToggleEventInterestResult>('toggleEventInterest', { eventId })
}

export async function getEventContactInfo(eventId: number) {
  return callCloud<ContactInfoResult>('getEventContactInfo', { eventId })
}

export async function submitEvent(data: Record<string, unknown>) {
  return callCloud<CloudResponse>('submitEvent', data)
}
