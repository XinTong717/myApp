import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import type { GetMapUsersResult } from '../types/domain'

const MAP_USERS_CACHE_KEY = 'cloud-cache:map-users:list:v1'
const MAP_USERS_TTL_MS = 2 * 60 * 1000

export async function getMapUsers(options: { forceRefresh?: boolean } = {}) {
  if (!options.forceRefresh) {
    const cached = await getScopedCachedValue<GetMapUsersResult>(MAP_USERS_CACHE_KEY)
    if (cached) {
      return cached
    }
  }

  const result = await callCloud<GetMapUsersResult>('getMapUsers')
  if (result.ok) {
    await setScopedCachedValue(MAP_USERS_CACHE_KEY, result, MAP_USERS_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<GetMapUsersResult>(MAP_USERS_CACHE_KEY)
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
  await clearScopedCachedValue(MAP_USERS_CACHE_KEY)
}
