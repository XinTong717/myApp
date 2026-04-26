import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import type { GetMapUsersResult } from '../types/domain'

const MAP_USERS_CACHE_KEY_PREFIX = 'cloud-cache:map-users:list:v2:'
const MAP_USERS_LEGACY_CACHE_KEY = 'cloud-cache:map-users:list:v1'
const MAP_USERS_TTL_MS = 2 * 60 * 1000

function normalizeProvince(value?: string) {
  return String(value || '').trim()
}

function getMapUsersCacheKey(province?: string) {
  return `${MAP_USERS_CACHE_KEY_PREFIX}${normalizeProvince(province) || 'all'}`
}

export async function getMapUsers(options: { forceRefresh?: boolean; province?: string } = {}) {
  const province = normalizeProvince(options.province)
  const cacheKey = getMapUsersCacheKey(province)

  if (!options.forceRefresh) {
    const cached = await getScopedCachedValue<GetMapUsersResult>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const result = await callCloud<GetMapUsersResult>('getMapUsers', province ? { province } : {})
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
    clearScopedCachedValue(MAP_USERS_LEGACY_CACHE_KEY),
    clearScopedCachedValue(getMapUsersCacheKey()),
  ])
}
