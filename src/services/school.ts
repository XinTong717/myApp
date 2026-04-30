import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import type {
  SchoolDetailResult,
  SchoolListResult,
  SubmitCommunityResult,
  SubmitCorrectionResult,
} from '../types/domain'

const SCHOOL_LIST_CACHE_KEY_PREFIX = 'cloud-cache:schools:list:v2:'
const SCHOOL_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:schools:detail:v1:'
const SCHOOL_LIST_TTL_MS = 30 * 60 * 1000
const SCHOOL_DETAIL_TTL_MS = 60 * 60 * 1000

function normalizeFilter(value?: string) {
  return String(value || '').trim()
}

function getSchoolListCacheKey(options: { province?: string; schoolType?: string; ageRange?: string; limit?: number } = {}) {
  return [
    SCHOOL_LIST_CACHE_KEY_PREFIX,
    normalizeFilter(options.province) || 'all-province',
    normalizeFilter(options.schoolType) || 'all-type',
    normalizeFilter(options.ageRange) || 'all-age',
    Number(options.limit || 80),
  ].join(':')
}

function getSchoolDetailCacheKey(schoolId: number) {
  return `${SCHOOL_DETAIL_CACHE_KEY_PREFIX}${schoolId}`
}

export async function getSchools(options: { forceRefresh?: boolean; province?: string; schoolType?: string; ageRange?: string; limit?: number } = {}) {
  const province = normalizeFilter(options.province)
  const schoolType = normalizeFilter(options.schoolType)
  const ageRange = normalizeFilter(options.ageRange)
  const limit = Number(options.limit || 80)
  const cacheKey = getSchoolListCacheKey({ province, schoolType, ageRange, limit })
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolListResult>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await callCloud<SchoolListResult>('getSchools', {
    limit,
    ...(province ? { province } : {}),
    ...(schoolType ? { schoolType } : {}),
    ...(ageRange ? { ageRange } : {}),
  })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, result, SCHOOL_LIST_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<SchoolListResult>(cacheKey)
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

export async function getSchoolDetail(schoolId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getSchoolDetailCacheKey(schoolId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolDetailResult>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await callCloud<SchoolDetailResult>('getSchoolDetail', { schoolId })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, result, SCHOOL_DETAIL_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<SchoolDetailResult>(cacheKey)
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

export async function submitCommunity(data: Record<string, unknown>) {
  return callCloud<SubmitCommunityResult>('submitCommunity', data)
}

export async function submitCorrection(schoolId: number, schoolName: string, content: string) {
  return callCloud<SubmitCorrectionResult>('submitCorrection', { schoolId, schoolName, content })
}
