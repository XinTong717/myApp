import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import { runExclusive } from './internal/runExclusive'
import type {
  SchoolDetailResult,
  SchoolItem,
  SchoolListResult,
  SchoolLocationItem,
  SchoolMarkerItem,
  SchoolMarkerListResult,
  SubmitCorrectionResult,
  SubmitSchoolResult,
} from '../types/domain'

const SCHOOL_LIST_CACHE_KEY_PREFIX = 'cloud-cache:schools:list:v3:'
const SCHOOL_MARKERS_CACHE_KEY_PREFIX = 'cloud-cache:schools:markers:v7:'
const SCHOOL_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:schools:detail:v1:'
const SCHOOL_LIST_TTL_MS = 30 * 60 * 1000
const SCHOOL_MARKERS_TTL_MS = 30 * 60 * 1000
const SCHOOL_DETAIL_TTL_MS = 15 * 60 * 1000

type SchoolFilterValue = string | string[] | undefined
type SchoolListPayload = {
  schools?: SchoolItem[]
  total?: number
  limit?: number
  offset?: number
  nextOffset?: number | null
  hasMore?: boolean
}
type SchoolMarkerListPayload = { schools?: SchoolMarkerItem[] }
type SchoolDetailPayload = { school?: SchoolItem | null }

function splitLocationTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeSchoolLocations(item: SchoolItem): SchoolItem {
  const existingLocations = Array.isArray(item.locations)
    ? item.locations
      .filter((location) => location && location.status !== 'deleted')
      .map((location) => ({
        ...location,
        province: String(location.province || '').trim(),
        city: String(location.city || '').trim(),
      }))
      .filter((location) => location.province || location.city)
    : []

  if (existingLocations.length > 0) {
    return { ...item, locations: existingLocations }
  }

  const provinces = splitLocationTokens(item.province)
  const cities = splitLocationTokens(item.city)

  if (cities.length > 0) {
    return {
      ...item,
      locations: cities.map((city, index) => ({
        school_id: Number(item.id),
        province: provinces[index] || provinces[0] || '',
        city,
        status: 'legacy',
      } as SchoolLocationItem)),
    }
  }

  if (provinces.length > 0) {
    return {
      ...item,
      locations: provinces.map((province) => ({
        school_id: Number(item.id),
        province,
        city: '',
        status: 'legacy',
      } as SchoolLocationItem)),
    }
  }

  return item
}

function okSchoolList(payload: SchoolListPayload): SchoolListResult {
  return {
    ok: true,
    schools: Array.isArray(payload.schools) ? payload.schools.map(normalizeSchoolLocations) : [],
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : undefined,
    limit: Number.isFinite(Number(payload.limit)) ? Number(payload.limit) : undefined,
    offset: Number.isFinite(Number(payload.offset)) ? Number(payload.offset) : undefined,
    nextOffset: payload.nextOffset === null || payload.nextOffset === undefined ? null : Number(payload.nextOffset),
    hasMore: !!payload.hasMore,
  }
}

function okSchoolMarkers(payload: SchoolMarkerListPayload): SchoolMarkerListResult {
  return { ok: true, schools: Array.isArray(payload.schools) ? payload.schools : [] }
}

function okSchoolDetail(payload: SchoolDetailPayload): SchoolDetailResult {
  return { ok: true, school: payload.school ? normalizeSchoolLocations(payload.school) : null }
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

function normalizeOffset(value?: number) {
  const offset = Math.floor(Number(value || 0))
  return Number.isFinite(offset) && offset > 0 ? offset : 0
}

function getSchoolListCacheKey(options: { province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number; offset?: number } = {}) {
  return [
    SCHOOL_LIST_CACHE_KEY_PREFIX,
    normalizeFilterList(options.province).join('|') || 'all-province',
    normalizeFilterList(options.schoolType).join('|') || 'all-type',
    normalizeFilterList(options.ageRange).join('|') || 'all-age',
    Number(options.limit || 100),
    normalizeOffset(options.offset),
  ].join(':')
}

function getSchoolMarkersCacheKey(options: { province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number; offset?: number } = {}) {
  return [
    SCHOOL_MARKERS_CACHE_KEY_PREFIX,
    normalizeFilterList(options.province).join('|') || 'all-province',
    normalizeFilterList(options.schoolType).join('|') || 'all-type',
    normalizeFilterList(options.ageRange).join('|') || 'all-age',
    Number(options.limit || 200),
    normalizeOffset(options.offset),
  ].join(':')
}

function getSchoolDetailCacheKey(schoolId: number) {
  return `${SCHOOL_DETAIL_CACHE_KEY_PREFIX}${schoolId}`
}

function buildSchoolListParams(options: { province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number; offset?: number } = {}) {
  const provinces = normalizeFilterList(options.province)
  const schoolTypes = normalizeFilterList(options.schoolType)
  const ageRanges = normalizeFilterList(options.ageRange)
  const limit = Number(options.limit || 100)
  const offset = normalizeOffset(options.offset)
  return {
    limit,
    offset,
    params: {
      limit,
      offset,
      ...(provinces.length === 1 ? { province: provinces[0] } : {}),
      ...(provinces.length > 1 ? { provinces } : {}),
      ...(schoolTypes.length === 1 ? { schoolType: schoolTypes[0] } : {}),
      ...(schoolTypes.length > 1 ? { schoolTypes } : {}),
      ...(ageRanges.length === 1 ? { ageRange: ageRanges[0] } : {}),
      ...(ageRanges.length > 1 ? { ageRanges } : {}),
    },
    cacheShape: { province: provinces, schoolType: schoolTypes, ageRange: ageRanges, limit, offset },
  }
}

export async function getSchools(options: { forceRefresh?: boolean; province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number; offset?: number } = {}) {
  const { params, cacheShape } = buildSchoolListParams(options)
  const cacheKey = getSchoolListCacheKey(cacheShape)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolListPayload>(cacheKey)
  if (cached) return okSchoolList(cached)

  const result = await callCloud<SchoolListResult>('getSchools', params)
  if (result.ok) {
    const normalized = okSchoolList({
      schools: result.schools || [],
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      nextOffset: result.nextOffset,
      hasMore: result.hasMore,
    })
    await setScopedCachedValue(cacheKey, {
      schools: normalized.schools || [],
      total: normalized.total,
      limit: normalized.limit,
      offset: normalized.offset,
      nextOffset: normalized.nextOffset,
      hasMore: normalized.hasMore,
    }, SCHOOL_LIST_TTL_MS)
    return { ...result, ...normalized }
  }

  const staleCached = await getScopedCachedValue<SchoolListPayload>(cacheKey)
  if (staleCached) {
    return {
      ...okSchoolList(staleCached),
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function getSchoolMarkers(options: { forceRefresh?: boolean; province?: SchoolFilterValue; schoolType?: SchoolFilterValue; ageRange?: SchoolFilterValue; limit?: number; offset?: number } = {}) {
  const { params, cacheShape } = buildSchoolListParams({ ...options, limit: options.limit || 200 })
  const cacheKey = getSchoolMarkersCacheKey(cacheShape)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolMarkerListPayload>(cacheKey)
  if (cached) return okSchoolMarkers(cached)

  const result = await callCloud<SchoolMarkerListResult>('getSchoolMarkers', params)
  if (result.ok) {
    await setScopedCachedValue(cacheKey, { schools: result.schools || [] }, SCHOOL_MARKERS_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<SchoolMarkerListPayload>(cacheKey)
  if (staleCached) {
    return {
      ...okSchoolMarkers(staleCached),
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function getSchoolDetail(schoolId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getSchoolDetailCacheKey(schoolId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolDetailPayload>(cacheKey)
  if (cached) return okSchoolDetail(cached)

  const result = await callCloud<SchoolDetailResult>('getSchoolDetail', { schoolId })
  if (result.ok) {
    const normalized = okSchoolDetail({ school: result.school || null })
    await setScopedCachedValue(cacheKey, { school: normalized.school || null }, SCHOOL_DETAIL_TTL_MS)
    return { ...result, school: normalized.school }
  }

  const staleCached = await getScopedCachedValue<SchoolDetailPayload>(cacheKey)
  if (staleCached) {
    return {
      ...okSchoolDetail(staleCached),
      stale: true,
      code: result.code,
      message: result.message,
    }
  }

  return result
}

export async function submitSchool(data: Record<string, unknown>) {
  const locationKey = data?.isOnline ? 'online' : [data?.province, data?.city].map((item) => String(item || '').trim()).join(':')
  const dedupeKey = [data?.name, locationKey].map((item) => String(item || '').trim()).join(':')
  return runExclusive(`submitSchool:${dedupeKey}`, () => callCloud<SubmitSchoolResult>('submitSchool', data))
}

export async function submitCorrection(schoolId: number, schoolName: string, content: string) {
  return runExclusive(`submitCorrection:school:${schoolId}`, () => callCloud<SubmitCorrectionResult>('submitCorrection', { targetType: 'school', targetId: schoolId, targetTitle: schoolName, content }))
}
