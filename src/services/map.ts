import { callCloud } from './cloud'
import { clearScopedCachedValuesByPrefix, getScopedCachedValue, setScopedCachedValue } from './cache'
import { CACHE_KEY_PREFIXES } from '../constants/cacheKeys'
import type { GetMapUsersResult, MapProvinceStat, MapUser } from '../types/domain'

const MAP_USERS_CACHE_KEY_PREFIX = CACHE_KEY_PREFIXES.mapUsers
const MAP_USERS_TTL_MS = 2 * 60 * 1000
const MAP_USERS_AUTO_PAGE_LIMIT = 300
const MAP_USERS_AUTO_PAGE_MAX_PAGES = 5

type MapUsersPayload = {
  users?: MapUser[]
  provinceStats?: MapProvinceStat[]
  province?: string
  mode?: 'province_summary' | 'province_detail'
  limit?: number
  offset?: number
  nextOffset?: number | null
  hasMore?: boolean
  autoPaged?: boolean
  loadedPages?: number
  loadedUserCount?: number
}

function okMapUsers(payload: MapUsersPayload): GetMapUsersResult {
  return {
    ok: true,
    users: Array.isArray(payload.users) ? payload.users : [],
    provinceStats: Array.isArray(payload.provinceStats) ? payload.provinceStats : [],
    province: payload.province || '',
    mode: payload.mode,
    limit: payload.limit,
    offset: payload.offset,
    nextOffset: typeof payload.nextOffset === 'number' ? payload.nextOffset : null,
    hasMore: !!payload.hasMore,
    autoPaged: !!payload.autoPaged,
    loadedPages: payload.loadedPages,
    loadedUserCount: payload.loadedUserCount,
  }
}

function toMapUsersPayload(result: GetMapUsersResult): MapUsersPayload {
  return {
    users: result.users || [],
    provinceStats: result.provinceStats || [],
    province: result.province || '',
    mode: result.mode,
    limit: result.limit,
    offset: result.offset,
    nextOffset: typeof result.nextOffset === 'number' ? result.nextOffset : null,
    hasMore: !!result.hasMore,
    autoPaged: !!result.autoPaged,
    loadedPages: result.loadedPages,
    loadedUserCount: result.loadedUserCount,
  }
}

function normalizeProvince(value?: string) {
  return String(value || '').trim()
}

function normalizeFilter(value?: string) {
  return String(value || '').trim()
}

function splitFilterText(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => normalizeFilter(item))
    .filter(Boolean)
}

function normalizeFilterList(value?: string | string[]) {
  const values = Array.isArray(value) ? value.flatMap((item) => splitFilterText(item)) : splitFilterText(value)
  return Array.from(new Set(values.filter((item) => item && item !== '全部'))).sort()
}

function normalizeOffset(value?: number) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function getMapUsersCacheKey(province?: string, childAgeRanges?: string[], roles?: string[], offset?: number, limit?: number, autoPage?: boolean) {
  return `${MAP_USERS_CACHE_KEY_PREFIX}${normalizeProvince(province) || 'all'}:${normalizeFilterList(roles).join(',') || 'all-role'}:${normalizeFilterList(childAgeRanges).join(',') || 'all-child-stage'}:${normalizeOffset(offset)}:${limit || 'default-limit'}:${autoPage === true ? 'auto-page' : 'single-page'}`
}

async function fetchMapUsersPage(params: { province?: string; roles?: string[]; childAgeRanges?: string[]; offset?: number; limit?: number }) {
  return callCloud<GetMapUsersResult>('getMapUsers', {
    ...(params.province ? { province: params.province } : {}),
    ...(params.roles && params.roles.length > 0 ? { roles: params.roles } : {}),
    ...(params.childAgeRanges && params.childAgeRanges.length > 0 ? { childAgeRanges: params.childAgeRanges } : {}),
    ...(params.offset ? { offset: params.offset } : {}),
    ...(params.limit ? { limit: params.limit } : {}),
  })
}

async function fetchAllProvinceUserPages(firstPage: GetMapUsersResult, params: { province: string; roles?: string[]; childAgeRanges?: string[]; limit: number }) {
  const users: MapUser[] = Array.isArray(firstPage.users) ? [...firstPage.users] : []
  let nextOffset = typeof firstPage.nextOffset === 'number' ? firstPage.nextOffset : null
  let hasMore = !!firstPage.hasMore && nextOffset !== null
  let pageCount = 1

  while (hasMore && nextOffset !== null && pageCount < MAP_USERS_AUTO_PAGE_MAX_PAGES) {
    const page = await fetchMapUsersPage({
      province: params.province,
      roles: params.roles,
      childAgeRanges: params.childAgeRanges,
      offset: nextOffset,
      limit: params.limit,
    })

    if (!page.ok) break

    users.push(...(Array.isArray(page.users) ? page.users : []))
    nextOffset = typeof page.nextOffset === 'number' ? page.nextOffset : null
    hasMore = !!page.hasMore && nextOffset !== null
    pageCount += 1
  }

  return {
    ...firstPage,
    users,
    offset: 0,
    limit: params.limit,
    nextOffset,
    hasMore,
    autoPaged: true,
    loadedPages: pageCount,
    loadedUserCount: users.length,
  } as GetMapUsersResult
}

export async function getMapUsers(options: { forceRefresh?: boolean; province?: string; childAgeRange?: string; childAgeRanges?: string[]; role?: string; roles?: string[]; offset?: number; limit?: number; autoPage?: boolean } = {}) {
  const province = normalizeProvince(options.province)
  const childAgeRanges = normalizeFilterList(options.childAgeRanges || options.childAgeRange)
  const roles = normalizeFilterList(options.roles || options.role)
  const offset = normalizeOffset(options.offset)
  // Province detail mode filters users after safety/privacy checks. Auto-page by default
  // so role/child-stage filters are applied across the first few pages, not only page 1.
  const shouldAutoPage = !!province && offset === 0 && options.autoPage !== false
  const pageLimit = options.limit || (shouldAutoPage ? MAP_USERS_AUTO_PAGE_LIMIT : undefined)
  const cacheKey = getMapUsersCacheKey(province, childAgeRanges, roles, offset, pageLimit, shouldAutoPage)

  if (!options.forceRefresh) {
    const cached = await getScopedCachedValue<MapUsersPayload>(cacheKey)
    if (cached) return okMapUsers(cached)
  }

  const firstPage = await fetchMapUsersPage({
    province: province || undefined,
    roles,
    childAgeRanges,
    offset,
    limit: pageLimit,
  })

  if (firstPage.ok) {
    const result = shouldAutoPage
      ? await fetchAllProvinceUserPages(firstPage, { province, roles, childAgeRanges, limit: pageLimit || MAP_USERS_AUTO_PAGE_LIMIT })
      : firstPage

    await setScopedCachedValue(cacheKey, toMapUsersPayload(result), MAP_USERS_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<MapUsersPayload>(cacheKey)
  if (staleCached) {
    return {
      ...okMapUsers(staleCached),
      stale: true,
      code: firstPage.code,
      message: firstPage.message,
    }
  }

  return firstPage
}

export async function clearMapUsersCache() {
  await clearScopedCachedValuesByPrefix(MAP_USERS_CACHE_KEY_PREFIX)
}
