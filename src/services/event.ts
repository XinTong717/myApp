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

const EVENT_LIST_CACHE_KEY_PREFIX = 'cloud-cache:events:list:v4:'
const EVENT_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:events:detail:v2:'
const EVENT_INTEREST_INFO_CACHE_KEY_PREFIX = 'cloud-cache:events:interest-info:v1:'
const EVENT_CONTACT_INFO_CACHE_KEY_PREFIX = 'cloud-cache:events:contact-info:v1:'
const EVENT_LIST_TTL_MS = 5 * 60 * 1000
const EVENT_DETAIL_TTL_MS = 10 * 60 * 1000
const EVENT_RUNTIME_TTL_MS = 45 * 1000

type EventListPayload = { events?: EventItem[]; degraded?: boolean }
type EventDetailPayload = { event?: EventItem | null }
type EventInterestInfoPayload = Pick<EventInterestInfoResult, 'count' | 'hasInterested' | 'degraded'>
type ContactInfoPayload = Pick<ContactInfoResult, 'contactInfo' | 'publicSignupInfo' | 'needCompleteProfile' | 'privateContactRequiresProfile' | 'message'>

type GetEventsOptions = {
  forceRefresh?: boolean
  includeInterestCounts?: boolean
  includeEnded?: boolean
}

function getEventListCacheKey(includeEnded: boolean) {
  return `${EVENT_LIST_CACHE_KEY_PREFIX}${includeEnded ? 'with-ended' : 'active'}`
}

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

function okEventInterestInfo(payload: EventInterestInfoPayload): EventInterestInfoResult {
  return {
    ok: true,
    count: Number(payload.count || 0),
    hasInterested: !!payload.hasInterested,
    ...(payload.degraded ? { degraded: true } : {}),
  }
}

function okContactInfo(payload: ContactInfoPayload): ContactInfoResult {
  return {
    ok: true,
    contactInfo: payload.contactInfo || '',
    publicSignupInfo: payload.publicSignupInfo,
    needCompleteProfile: !!payload.needCompleteProfile,
    privateContactRequiresProfile: !!payload.privateContactRequiresProfile,
    message: payload.message,
  }
}

function getEventDetailCacheKey(eventId: number) {
  return `${EVENT_DETAIL_CACHE_KEY_PREFIX}${eventId}`
}

function getEventInterestInfoCacheKey(eventId: number) {
  return `${EVENT_INTEREST_INFO_CACHE_KEY_PREFIX}${eventId}`
}

function getEventContactInfoCacheKey(eventId: number) {
  return `${EVENT_CONTACT_INFO_CACHE_KEY_PREFIX}${eventId}`
}

async function readEventListCache(includeEnded: boolean) {
  return await getScopedCachedValue<EventListPayload>(getEventListCacheKey(includeEnded))
}

export async function clearEventListCache() {
  await Promise.all([
    clearScopedCachedValue(getEventListCacheKey(false)),
    clearScopedCachedValue(getEventListCacheKey(true)),
  ])
}

export async function clearEventRuntimeCache(eventId: number) {
  await Promise.all([
    clearScopedCachedValue(getEventInterestInfoCacheKey(eventId)),
    clearScopedCachedValue(getEventContactInfoCacheKey(eventId)),
  ])
}

export async function getEvents(options: GetEventsOptions = {}) {
  const includeInterestCounts = options.includeInterestCounts !== false
  const includeEnded = options.includeEnded === true
  const cached = options.forceRefresh ? null : await readEventListCache(includeEnded)
  if (cached) return okEventList(cached)

  const result = await callCloud<EventListResult>('getEvents', { includeInterestCounts, includeEnded })
  if (result.ok) {
    await setScopedCachedValue(getEventListCacheKey(includeEnded), { events: result.events || [] }, EVENT_LIST_TTL_MS)
    return result
  }

  if (includeInterestCounts) {
    const fallbackResult = await callCloud<EventListResult>('getEvents', { includeInterestCounts: false, includeEnded })
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
      await setScopedCachedValue(getEventListCacheKey(includeEnded), { events, degraded: true }, EVENT_LIST_TTL_MS)
      return degradedResult
    }
  }

  const staleCached = await readEventListCache(includeEnded)
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

export async function getEventInterestInfo(eventId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getEventInterestInfoCacheKey(eventId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<EventInterestInfoPayload>(cacheKey)
  if (cached) return okEventInterestInfo(cached)

  const result = await callCloud<EventInterestInfoResult>('getEventInterestInfo', { eventId })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, {
      count: result.count || 0,
      hasInterested: !!result.hasInterested,
      degraded: !!result.degraded,
    }, EVENT_RUNTIME_TTL_MS)
  }
  return result
}

export async function toggleEventInterest(eventId: number) {
  return runExclusive(`toggleEventInterest:${eventId}`, async () => {
    const result = await callCloud<ToggleEventInterestResult>('toggleEventInterest', { eventId })
    if (result.ok) {
      await Promise.all([
        clearEventRuntimeCache(eventId),
        clearEventListCache(),
      ])
    }
    return result
  })
}

export async function getEventContactInfo(eventId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getEventContactInfoCacheKey(eventId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<ContactInfoPayload>(cacheKey)
  if (cached) return okContactInfo(cached)

  const result = await callCloud<ContactInfoResult>('getEventContactInfo', { eventId })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, {
      contactInfo: result.contactInfo || '',
      publicSignupInfo: result.publicSignupInfo,
      needCompleteProfile: !!result.needCompleteProfile,
      privateContactRequiresProfile: !!result.privateContactRequiresProfile,
      message: result.message,
    }, EVENT_RUNTIME_TTL_MS)
  }
  return result
}

export async function submitEvent(data: Record<string, unknown>) {
  const dedupeKey = String(data?.title || '') + ':' + String(data?.startTime || '')
  return runExclusive(`submitEvent:${dedupeKey}`, () => callCloud<CloudResponse>('submitEvent', data))
}
