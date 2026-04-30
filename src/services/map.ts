import { callCloud } from './cloud'
import { clearScopedCachedValue, clearScopedCachedValuesByPrefix, getScopedCachedValue, setScopedCachedValue } from './cache'
import { CACHE_KEY_PREFIXES } from '../constants/cacheKeys'
import type { GetMapUsersResult } from '../types/domain'

const MAP_USERS_CACHE_KEY_PREFIX = CACHE_KEY_PREFIXES.mapUsers
const MAP_USERS_LEGACY_CACHE_KEYS = [
  'cloud-cache:map-users:list:v1',
  'cloud-cache:map-users:list:v2:all:all-child-stage',
]
const MAP_USERS_TTL_MS = 2 * 60 * 1000

function normalizeProvince(value?: string) {
  return String(value || '').trim()
}

function normalizeFilter(value?: string) {
  return String(value || '').trim()
}

function getMapUsersCacheKey(province?: string, childAgeRange?: string, role?: string) {
  return `${MAP_USERS_CACHE_KEY_PREFIX}${normalizeProvince(province) || 'all'}:${normalizeFilter(role) || 'all-role'}:${normalizeFilter(childAgeRange) || 'all-child-stage'}`
}

export async function getMapUsers(options: { forceRefresh?: boolean; province?: string; childAgeRange?: string; role?: string } = {}) {
  const province = normalizeProvince(options.province)
  const childAgeRange = normalizeFilter(options.childAgeRange)
  const role = normalizeFilter(options.role)
  const cacheKey = getMapUsersCacheKey(province, childAgeRange, role)

  if (!options.forceRefresh) {
    const cached = await getScopedCachedValue<GetMapUsersResult>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const result = await callCloud<GetMapUsersResult>('getMapUsers', {
    ...(province ? { province } : {}),
    ...(role && role !== '全部' ? { role } : {}),
    ...(childAgeRange ? { childAgeRange } : {}),
  })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, result, MAP_USERS_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<GetMapUsersResult>(cacheKey)
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

export async function clearMapUsersCache() {
  await Promise.all([
    ...MAP_USERS_LEGACY_CACHE_KEYS.map((key) => clearScopedCachedValue(key)),
    clearScopedCachedValuesByPrefix(MAP_USERS_CACHE_KEY_PREFIX),
  ])
}
