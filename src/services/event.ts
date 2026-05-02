import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import { runExclusive } from './internal/runExclusive'
import type {
  CloudResponse,
  ContactInfoResult,
  EventDetailResult,
  EventInterestCountsBatchResult,
  EventInterestInfoResult,
  EventItem,
  EventListResult,
  ToggleEventInterestResult,
} from '../types/domain'

const EVENT_LIST_CACHE_KEY = 'cloud-cache:events:list:v3'
const EVENT_LIST_LEGACY_CACHE_KEYS = ['cloud-cache:events:list:v1', 'cloud-cache:events:list:v2']
const EVENT_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:events:detail:v2:'
const EVENT_LIST_TTL_MS = 5 * 60 * 1000
const EVENT_DETAIL_TTL_MS = 10 * 60 * 1000

type EventListPayload = { events?: EventItem[]; degraded?: boolean }
type EventDetailPayload = { event?: EventItem | null }

function okEventList(payload: EventListPayload): EventListResult {
  return {
    ok: true,
    events: Array.isArray(payload.events) ? payload.events : [],
    ...(payload.degraded ? { degraded: true } : {}),
  }
}

function okEventDetail(payload: EventDetailPayload): EventDetailResult {
  return { ok: true, event: payload.event || null }
}

function getEventDetailCacheKey(eventId: number) {
  return `${EVENT_DETAIL_CACHE_KEY_PREFIX}${eventId}`
}

async function readAnyEventListCache() {
  return await getScopedCachedValue<EventListPayload>(EVENT_LIST_CACHE_KEY)
}

export async function clearEventListCache() {
  await Promise.all([
    clearScopedCachedValue(EVENT_LIST_CACHE_KEY),
    ...EVENT_LIST_LEGACY_CACHE_KEYS.map((key) => clearScopedCachedValue(key)),
  ])
}

export async function getEvents(options: { forceRefresh?: boolean; includeInterestCounts?: boolean } = {}) {
  const includeInterestCounts = options.includeInterestCounts !== false
  const cached = options.forceRefresh ? null : await readAnyEventListCache()
  if (cached) return okEventList(cached)

  const result = await callCloud<EventListResult>('getEvents', { includeInterestCounts })
  if (result.ok) {
    await setScopedCachedValue(EVENT_LIST_CACHE_KEY, { events: result.events || [] }, EVENT_LIST_TTL_MS)
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
      await setScopedCachedValue(EVENT_LIST_CACHE_KEY, { events, degraded: true }, EVENT_LIST_TTL_MS)
      return degradedResult
    }
  }

  const staleCached = await readAnyEventListCache()
  if (staleCached) {
    return {
      ...okEventList(staleCached),
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function getEventDetail(eventId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getEventDetailCacheKey(eventId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<EventDetailPayload>(cacheKey)
  if (cached) return okEventDetail(cached)

  const result = await callCloud<EventDetailResult>('getEventDetail', { eventId })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, { event: result.event || null }, EVENT_DETAIL_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<EventDetailPayload>(cacheKey)
  if (staleCached) {
    return {
      ...okEventDetail(staleCached),
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function getEventInterestCountsBatch(eventIds: number[]) {
  return callCloud<EventInterestCountsBatchResult>('getEventInterestCountsBatch', { eventIds })
}

export async function getEventInterestInfo(eventId: number) {
  return callCloud<EventInterestInfoResult>('getEventInterestInfo', { eventId })
}

export async function toggleEventInterest(eventId: number) {
  return runExclusive(`toggleEventInterest:${eventId}`, () => callCloud<ToggleEventInterestResult>('toggleEventInterest', { eventId }))
}

export async function getEventContactInfo(eventId: number) {
  return callCloud<ContactInfoResult>('getEventContactInfo', { eventId })
}

export async function submitEvent(data: Record<string, unknown>) {
  const dedupeKey = String(data?.title || '') + ':' + String(data?.startTime || '')
  return runExclusive(`submitEvent:${dedupeKey}`, () => callCloud<CloudResponse>('submitEvent', data))
}
