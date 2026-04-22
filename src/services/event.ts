import { callCloud } from './cloud'
import { getCachedValue, setCachedValue } from './cache'
import type {
  CloudResponse,
  ContactInfoResult,
  EventDetailResult,
  EventInterestCountsBatchResult,
  EventInterestInfoResult,
  EventListResult,
  ToggleEventInterestResult,
} from '../types/domain'

const EVENT_LIST_CACHE_KEY = 'cloud-cache:events:list:v1'
const EVENT_LIST_TTL_MS = 5 * 60 * 1000

export async function getEvents(options: { forceRefresh?: boolean } = {}) {
  if (!options.forceRefresh) {
    const cached = getCachedValue<EventListResult>(EVENT_LIST_CACHE_KEY)
    if (cached) {
      return cached
    }
  }

  const result = await callCloud<EventListResult>('getEvents')
  if (result.ok) {
    setCachedValue(EVENT_LIST_CACHE_KEY, result, EVENT_LIST_TTL_MS)
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
