import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
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
const EVENT_LIST_TTL_MS = 5 * 60 * 1000

export async function getEvents(options: { forceRefresh?: boolean; includeInterestCounts?: boolean } = {}) {
  const includeInterestCounts = options.includeInterestCounts !== false
  const cached = options.forceRefresh ? null : await getScopedCachedValue<EventListResult>(EVENT_LIST_CACHE_KEY)
  if (cached) {
    return cached
  }

  const result = await callCloud<EventListResult>('getEvents', { includeInterestCounts })
  if (result.ok) {
    await setScopedCachedValue(EVENT_LIST_CACHE_KEY, result, EVENT_LIST_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<EventListResult>(EVENT_LIST_CACHE_KEY)
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
