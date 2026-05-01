import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import type {
  AdminAccessResult,
  GetMeResult,
  SaveProfileResult,
  SafetyOverviewResult,
  UpdatePrivacySettingsResult,
} from '../types/domain'

const PROFILE_CACHE_KEY = 'cloud-cache:profile:me:v1'
const SAFETY_OVERVIEW_CACHE_KEY = 'cloud-cache:profile:safety-overview:v1'
const ADMIN_ACCESS_CACHE_KEY = 'cloud-cache:profile:admin-access:v1'

const PROFILE_TTL_MS = 5 * 60 * 1000
const SAFETY_OVERVIEW_TTL_MS = 5 * 60 * 1000
const ADMIN_ACCESS_TTL_MS = 24 * 60 * 60 * 1000

export async function clearProfileCache() {
  await clearScopedCachedValue(PROFILE_CACHE_KEY)
}

export async function clearSafetyOverviewCache() {
  await clearScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY)
}

export async function clearAdminAccessCache() {
  await clearScopedCachedValue(ADMIN_ACCESS_CACHE_KEY)
}

export async function getMe(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<GetMeResult>(PROFILE_CACHE_KEY)
  if (cached) return cached

  const result = await callCloud<GetMeResult>('getMe')
  if (result.ok) {
    await setScopedCachedValue(PROFILE_CACHE_KEY, result, PROFILE_TTL_MS)
  }
  return result
}

export async function saveProfile(data: Record<string, unknown>) {
  const result = await callCloud<SaveProfileResult>('saveProfile', data)
  if (result.ok) {
    await clearProfileCache()
  }
  return result
}

export async function updatePrivacySettings(data: { allowIncomingRequests?: boolean; isVisibleOnMap?: boolean }) {
  const result = await callCloud<UpdatePrivacySettingsResult>('updatePrivacySettings', data)
  if (result.ok) {
    await Promise.all([
      clearProfileCache(),
      clearSafetyOverviewCache(),
    ])
  }
  return result
}

export async function getSafetyOverview(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SafetyOverviewResult>(SAFETY_OVERVIEW_CACHE_KEY)
  if (cached) return cached

  const result = await callCloud<SafetyOverviewResult>('getSafetyOverview')
  if (result.ok) {
    await setScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY, result, SAFETY_OVERVIEW_TTL_MS)
  }
  return result
}

export async function checkAdminAccess(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<AdminAccessResult>(ADMIN_ACCESS_CACHE_KEY)
  if (cached) return cached

  const result = await callCloud<AdminAccessResult>('checkAdminAccess')
  if (result.ok) {
    await setScopedCachedValue(ADMIN_ACCESS_CACHE_KEY, result, ADMIN_ACCESS_TTL_MS)
  }
  return result
}
