import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, setScopedCachedValue } from './cache'
import { clearMapUsersCache } from './map'
import type {
  AdminAccessResult,
  GetMeResult,
  SafetyOverviewResult,
  UpdatePrivacySettingsResult,
  UserProfile,
} from '../types/domain'

const PROFILE_CACHE_KEY = 'cloud-cache:profile:me:v2'
const PROFILE_LEGACY_CACHE_KEY = 'cloud-cache:profile:me:v1'
const SAFETY_OVERVIEW_CACHE_KEY = 'cloud-cache:profile:safety-overview:v2'
const SAFETY_OVERVIEW_LEGACY_CACHE_KEY = 'cloud-cache:profile:safety-overview:v1'
const ADMIN_ACCESS_CACHE_KEY = 'cloud-cache:profile:admin-access:v2'
const ADMIN_ACCESS_LEGACY_CACHE_KEY = 'cloud-cache:profile:admin-access:v1'

const PROFILE_TTL_MS = 5 * 60 * 1000
const SAFETY_OVERVIEW_TTL_MS = 5 * 60 * 1000
const ADMIN_ACCESS_TTL_MS = 24 * 60 * 60 * 1000

type ProfilePayload = { profile?: UserProfile | null }
type SafetyOverviewPayload = Pick<SafetyOverviewResult, 'blocked' | 'muted'>
type AdminAccessPayload = Pick<AdminAccessResult, 'isAdmin' | 'admin'>

function okProfile(payload: ProfilePayload): GetMeResult {
  return { ok: true, profile: payload.profile || null }
}

function okSafetyOverview(payload: SafetyOverviewPayload): SafetyOverviewResult {
  return { ok: true, blocked: payload.blocked || [], muted: payload.muted || [] }
}

function okAdminAccess(payload: AdminAccessPayload): AdminAccessResult {
  return { ok: true, isAdmin: !!payload.isAdmin, admin: payload.admin }
}

export async function clearProfileCache() {
  await Promise.all([
    clearScopedCachedValue(PROFILE_CACHE_KEY),
    clearScopedCachedValue(PROFILE_LEGACY_CACHE_KEY),
  ])
}

export async function clearSafetyOverviewCache() {
  await Promise.all([
    clearScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY),
    clearScopedCachedValue(SAFETY_OVERVIEW_LEGACY_CACHE_KEY),
  ])
}

export async function clearAdminAccessCache() {
  await Promise.all([
    clearScopedCachedValue(ADMIN_ACCESS_CACHE_KEY),
    clearScopedCachedValue(ADMIN_ACCESS_LEGACY_CACHE_KEY),
  ])
}

export async function getMe(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<ProfilePayload>(PROFILE_CACHE_KEY)
  if (cached) return okProfile(cached)

  const result = await callCloud<GetMeResult>('getMe')
  if (result.ok) {
    await setScopedCachedValue(PROFILE_CACHE_KEY, { profile: result.profile || null }, PROFILE_TTL_MS)
  }
  return result
}

export async function saveProfile(data: Record<string, unknown>) {
  const result = await callCloud('saveProfile', data)
  if (result.ok) {
    await Promise.all([
      clearProfileCache(),
      clearMapUsersCache(),
    ])
  }
  return result
}

export async function updatePrivacySettings(data: { allowIncomingRequests?: boolean; isVisibleOnMap?: boolean }) {
  const result = await callCloud<UpdatePrivacySettingsResult>('updatePrivacySettings', data)
  if (result.ok) {
    await Promise.all([
      clearProfileCache(),
      clearSafetyOverviewCache(),
      clearMapUsersCache(),
    ])
  }
  return result
}

export async function getSafetyOverview(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SafetyOverviewPayload>(SAFETY_OVERVIEW_CACHE_KEY)
  if (cached) return okSafetyOverview(cached)

  const result = await callCloud<SafetyOverviewResult>('getSafetyOverview')
  if (result.ok) {
    await setScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY, {
      blocked: result.blocked || [],
      muted: result.muted || [],
    }, SAFETY_OVERVIEW_TTL_MS)
  }
  return result
}

export async function checkAdminAccess(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<AdminAccessPayload>(ADMIN_ACCESS_CACHE_KEY)
  if (cached) return okAdminAccess(cached)

  const result = await callCloud<AdminAccessResult>('checkAdminAccess')
  if (result.ok) {
    await setScopedCachedValue(ADMIN_ACCESS_CACHE_KEY, {
      isAdmin: !!result.isAdmin,
      admin: result.admin,
    }, ADMIN_ACCESS_TTL_MS)
  }
  return result
}
