import { callCloud } from './cloud'
import { getCachedValue, setCachedValue } from './cache'
import type { GetMapUsersResult } from '../types/domain'

const MAP_USERS_CACHE_KEY = 'cloud-cache:map-users:list:v1'
const MAP_USERS_TTL_MS = 2 * 60 * 1000

export async function getMapUsers(options: { forceRefresh?: boolean } = {}) {
  if (!options.forceRefresh) {
    const cached = getCachedValue<GetMapUsersResult>(MAP_USERS_CACHE_KEY)
    if (cached) {
      return cached
    }
  }

  const result = await callCloud<GetMapUsersResult>('getMapUsers')
  if (result.ok) {
    setCachedValue(MAP_USERS_CACHE_KEY, result, MAP_USERS_TTL_MS)
  }
  return result
}
