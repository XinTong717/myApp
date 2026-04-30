import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import type {
  SchoolDetailResult,
  SchoolListResult,
  SubmitCommunityResult,
  SubmitCorrectionResult,
} from '../types/domain'

const SCHOOL_LIST_CACHE_KEY_PREFIX = 'cloud-cache:schools:list:v3:'
const SCHOOL_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:schools:detail:v1:'
const SCHOOL_LIST_TTL_MS = 30 * 60 * 1000
const SCHOOL_DETAIL_TTL_MS = 15 * 60 * 1000

type SchoolFilterValue = string | string[] | undefined

function normalizeFilter(value?: string) {
  return String(value || '').trim()
}

function normalizeFilterList(value?: SchoolFilterValue) {
  const list = Array.isArray(value) ? value : [value]
  return Array.from(new Set(
    list
      .flatMap((item) => String(item || '').split(/[、,，/|｜]+/))
      .map((item) => item.trim())
      .filter((item) => item && item !== '全部')
  )).sort()
}

function getSchoolListCacheKey(options: { province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number } = {}) {
  return [
    SCHOOL_LIST_CACHE_KEY_PREFIX,
    normalizeFilterList(options.province).join('|') || 'all-province',
    normalizeFilterList(options.schoolType).join('|') || 'all-type',
    normalizeFilterList(options.ageRange).join('|') || 'all-age',
    Number(options.limit || 80),
  ].join(':')
}

function getSchoolDetailCacheKey(schoolId: number) {
  return `${SCHOOL_DETAIL_CACHE_KEY_PREFIX}${schoolId}`
}

export async function getSchools(options: { forceRefresh?: boolean; province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number } = {}) {
  const provinces = normalizeFilterList(options.province)
  const schoolTypes = normalizeFilterList(options.schoolType)
  const ageRanges = normalizeFilterList(options.ageRange)
  const limit = Number(options.limit || 80)
  const cacheKey = getSchoolListCacheKey({ province: provinces, schoolType: schoolTypes, ageRange: ageRanges, limit })
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolListResult>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await callCloud<SchoolListResult>('getSchools', {
    limit,
    ...(provinces.length === 1 ? { province: provinces[0] } : {}),
    ...(provinces.length > 1 ? { provinces } : {}),
    ...(schoolTypes.length === 1 ? { schoolType: schoolTypes[0] } : {}),
    ...(schoolTypes.length > 1 ? { schoolTypes } : {}),
    ...(ageRanges.length === 1 ? { ageRange: ageRanges[0] } : {}),
    ...(ageRanges.length > 1 ? { ageRanges } : {}),
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
