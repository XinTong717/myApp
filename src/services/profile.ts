import Taro from '@tarojs/taro'
import { callCloud } from './cloud'
import { clearScopedCachedValue, getScopedCachedValue, getScopedCachedValueAllowExpired, setScopedCachedValue } from './cache'
import { clearMapUsersCache } from './map'
import { STORAGE_FLAGS } from '../constants/storageFlags'
import type {
  AdminAccessResult,
  CloudResponse,
  GetMeResult,
  SafetyOverviewResult,
  SimpleActionResult,
  UpdatePrivacySettingsResult,
  UserProfile,
} from '../types/domain'

const PROFILE_CACHE_KEY = 'cloud-cache:profile:me:v1'
const SAFETY_OVERVIEW_CACHE_KEY = 'cloud-cache:profile:safety-overview:v1'
const ADMIN_ACCESS_CACHE_KEY = 'cloud-cache:profile:admin-access:v1'
const EXPLORE_ONBOARDING_KEY = 'explore-onboarding:v1'

const PROFILE_TTL_MS = 5 * 60 * 1000
const SAFETY_OVERVIEW_TTL_MS = 5 * 60 * 1000
const ADMIN_ACCESS_TTL_MS = 24 * 60 * 60 * 1000

type ProfilePayload = { profile?: UserProfile | null }
type SafetyOverviewPayload = Pick<SafetyOverviewResult, 'blocked' | 'muted'>
type AdminAccessPayload = Pick<AdminAccessResult, 'isAdmin' | 'admin'>
type BootstrapPart<T> = {
  ok: boolean
  data?: T | null
  code?: string
  message?: string
}
export type ProfileBootstrapResult = CloudResponse<{
  profile?: BootstrapPart<GetMeResult>
  safetyOverview?: BootstrapPart<SafetyOverviewResult>
  adminAccess?: BootstrapPart<AdminAccessResult>
  legalConsent?: BootstrapPart<Record<string, unknown>>
}>

function okProfile(payload: ProfilePayload, meta: { stale?: boolean } = {}): GetMeResult {
  return { ok: true, profile: payload.profile || null, ...(meta.stale ? { stale: true } : {}) }
}

function okSafetyOverview(payload: SafetyOverviewPayload): SafetyOverviewResult {
  return { ok: true, blocked: payload.blocked || [], muted: payload.muted || [] }
}

function okAdminAccess(payload: AdminAccessPayload): AdminAccessResult {
  return { ok: true, isAdmin: !!payload.isAdmin, admin: payload.admin }
}

async function flagExploreRefresh() {
  try {
    Taro.setStorageSync(STORAGE_FLAGS.exploreForceRefresh, String(Date.now()))
  } catch (err) {
    console.warn('flagExploreRefresh skipped:', err)
  }
}

function resetExploreOnboardingFlag() {
  try {
    Taro.removeStorageSync(EXPLORE_ONBOARDING_KEY)
  } catch (err) {
    console.warn('resetExploreOnboardingFlag skipped:', err)
  }
}

export async function clearProfileCache() {
  await clearScopedCachedValue(PROFILE_CACHE_KEY)
}

export async function clearSafetyOverviewCache() {
  await clearScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY)
}

export async function clearAdminAccessCache() {
  await clearScopedCachedValue(ADMIN_ACCESS_CACHE_KEY)
}

export async function getProfileBootstrap() {
  const result = await callCloud<ProfileBootstrapResult>('getProfileBootstrap')
  const profileData = result.profile?.ok ? result.profile.data : null
  const safetyData = result.safetyOverview?.ok ? result.safetyOverview.data : null
  const adminData = result.adminAccess?.ok ? result.adminAccess.data : null

  await Promise.all([
    profileData?.ok ? setScopedCachedValue(PROFILE_CACHE_KEY, { profile: profileData.profile || null }, PROFILE_TTL_MS) : Promise.resolve(),
    safetyData?.ok ? setScopedCachedValue(SAFETY_OVERVIEW_CACHE_KEY, { blocked: safetyData.blocked || [], muted: safetyData.muted || [] }, SAFETY_OVERVIEW_TTL_MS) : Promise.resolve(),
    adminData?.ok ? setScopedCachedValue(ADMIN_ACCESS_CACHE_KEY, { isAdmin: !!adminData.isAdmin, admin: adminData.admin }, ADMIN_ACCESS_TTL_MS) : Promise.resolve(),
  ])

  return result
}

export async function getMe(options: { forceRefresh?: boolean; allowStale?: boolean } = {}) {
  if (!options.forceRefresh) {
    if (options.allowStale) {
      const staleCached = await getScopedCachedValueAllowExpired<ProfilePayload>(PROFILE_CACHE_KEY)
      if (staleCached) return okProfile(staleCached.value, { stale: staleCached.stale })
    } else {
      const cached = await getScopedCachedValue<ProfilePayload>(PROFILE_CACHE_KEY)
      if (cached) return okProfile(cached)
    }
  }

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
      flagExploreRefresh(),
    ])
  }
  return result
}

export async function updatePrivacySettings(data: { expandedProfileVisible?: boolean; isVisibleOnMap?: boolean }) {
  const result = await callCloud<UpdatePrivacySettingsResult>('updatePrivacySettings', data)
  if (result.ok) {
    await Promise.all([
      clearProfileCache(),
      clearSafetyOverviewCache(),
      clearMapUsersCache(),
      flagExploreRefresh(),
    ])
  }
  return result
}

export async function requestAccountDeletion(note = '') {
  const result = await callCloud<SimpleActionResult>('requestAccountDeletion', { note })
  if (result.ok) {
    resetExploreOnboardingFlag()
    await Promise.all([
      clearProfileCache(),
      clearMapUsersCache(),
      flagExploreRefresh(),
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
