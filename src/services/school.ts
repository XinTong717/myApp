import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import { runExclusive } from './internal/runExclusive'
import type {
  SchoolDetailResult,
  SchoolItem,
  SchoolListResult,
  SchoolMarkerItem,
  SchoolMarkerListResult,
  SubmitCorrectionResult,
  SubmitSchoolResult,
} from '../types/domain'

const SCHOOL_LIST_CACHE_KEY_PREFIX = 'cloud-cache:schools:list:v6:'
const SCHOOL_MARKERS_CACHE_KEY_PREFIX = 'cloud-cache:schools:markers:v6:'
const SCHOOL_DETAIL_CACHE_KEY_PREFIX = 'cloud-cache:schools:detail:v6:'
const SCHOOL_LIST_TTL_MS = 30 * 60 * 1000
const SCHOOL_MARKERS_TTL_MS = 30 * 60 * 1000
const SCHOOL_DETAIL_TTL_MS = 15 * 60 * 1000
const SCHOOL_PAGE_SIZE = 100
const SCHOOL_AUTO_PAGE_MAX = 20

type SchoolFilterValue = string | string[] | undefined
type SchoolListPayload = { schools?: SchoolItem[] }
type SchoolMarkerListPayload = { schools?: SchoolMarkerItem[] }
type SchoolDetailPayload = { school?: SchoolItem | null }
type SchoolQueryOptions = {
  forceRefresh?: boolean
  province?: SchoolFilterValue
  provinces?: SchoolFilterValue
  schoolType?: SchoolFilterValue
  schoolTypes?: SchoolFilterValue
  boardingType?: SchoolFilterValue
  boardingTypes?: SchoolFilterValue
  ageRange?: SchoolFilterValue
  ageRanges?: SchoolFilterValue
  limit?: number
}

type SchoolCacheShape = Omit<SchoolQueryOptions, 'forceRefresh'>
type SchoolPageParams = Record<string, unknown> & { limit: number; offset?: number }

function okSchoolList(payload: SchoolListPayload): SchoolListResult {
  return { ok: true, schools: Array.isArray(payload.schools) ? payload.schools : [] }
}

function okSchoolMarkers(payload: SchoolMarkerListPayload): SchoolMarkerListResult {
  return { ok: true, schools: Array.isArray(payload.schools) ? payload.schools : [] }
}

function okSchoolDetail(payload: SchoolDetailPayload): SchoolDetailResult {
  return { ok: true, school: payload.school || null }
}

function normalizeFilterList(...values: Array<SchoolFilterValue>) {
  return Array.from(new Set(
    values
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .flatMap((item) => String(item || '').split(/[、,，/|｜]+/))
      .map((item) => item.trim())
      .filter((item) => item && item !== '全部')
  )).sort()
}

function normalizePageSize(value?: number) {
  return Math.min(Math.max(Number(value || SCHOOL_PAGE_SIZE), 1), SCHOOL_PAGE_SIZE)
}

function getSchoolListCacheKey(options: SchoolCacheShape = {}) {
  return [
    SCHOOL_LIST_CACHE_KEY_PREFIX,
    normalizeFilterList(options.province, options.provinces).join('|') || 'all-province',
    normalizeFilterList(options.schoolType, options.schoolTypes).join('|') || 'all-type',
    normalizeFilterList(options.boardingType, options.boardingTypes).join('|') || 'all-boarding',
    normalizeFilterList(options.ageRange, options.ageRanges).join('|') || 'all-age',
    'auto',
    normalizePageSize(options.limit),
  ].join(':')
}

function getSchoolMarkersCacheKey(options: SchoolCacheShape = {}) {
  return [
    SCHOOL_MARKERS_CACHE_KEY_PREFIX,
    normalizeFilterList(options.province, options.provinces).join('|') || 'all-province',
    normalizeFilterList(options.schoolType, options.schoolTypes).join('|') || 'all-type',
    normalizeFilterList(options.boardingType, options.boardingTypes).join('|') || 'all-boarding',
    normalizeFilterList(options.ageRange, options.ageRanges).join('|') || 'all-age',
    'auto',
    normalizePageSize(options.limit),
  ].join(':')
}

function getSchoolDetailCacheKey(schoolId: number) {
  return `${SCHOOL_DETAIL_CACHE_KEY_PREFIX}${schoolId}`
}

function buildSchoolListParams(options: SchoolCacheShape = {}) {
  const provinces = normalizeFilterList(options.province, options.provinces)
  const schoolTypes = normalizeFilterList(options.schoolType, options.schoolTypes)
  const boardingTypes = normalizeFilterList(options.boardingType, options.boardingTypes)
  const ageRanges = normalizeFilterList(options.ageRange, options.ageRanges)
  const limit = normalizePageSize(options.limit)
  return {
    limit,
    params: {
      limit,
      ...(provinces.length === 1 ? { province: provinces[0] } : {}),
      ...(provinces.length > 1 ? { provinces } : {}),
      ...(schoolTypes.length === 1 ? { schoolType: schoolTypes[0] } : {}),
      ...(schoolTypes.length > 1 ? { schoolTypes } : {}),
      ...(boardingTypes.length === 1 ? { boardingType: boardingTypes[0] } : {}),
      ...(boardingTypes.length > 1 ? { boardingTypes } : {}),
      ...(ageRanges.length === 1 ? { ageRange: ageRanges[0] } : {}),
      ...(ageRanges.length > 1 ? { ageRanges } : {}),
    } as SchoolPageParams,
    cacheShape: { province: provinces, schoolType: schoolTypes, boardingType: boardingTypes, ageRange: ageRanges, limit },
  }
}

function dedupeById<T extends { id?: number | string }>(items: T[]) {
  const map = new Map<string, T>()
  items.forEach((item, index) => {
    const key = String(item.id || index)
    if (!map.has(key)) map.set(key, item)
  })
  return Array.from(map.values())
}

async function fetchAllSchoolPages<T extends SchoolItem | SchoolMarkerItem>(cloudFnName: 'getSchools' | 'getSchoolMarkers', params: SchoolPageParams) {
  const items: T[] = []
  let offset = 0
  let loadedPages = 0
  let lastResult: SchoolListResult | SchoolMarkerListResult | null = null

  while (loadedPages < SCHOOL_AUTO_PAGE_MAX) {
    const result = await callCloud<SchoolListResult | SchoolMarkerListResult>(cloudFnName, { ...params, offset })
    lastResult = result
    if (!result.ok) return { result, items: dedupeById(items) }

    const pageItems = Array.isArray(result.schools) ? result.schools as T[] : []
    items.push(...pageItems)
    loadedPages += 1

    if (!result.hasMore || result.nextOffset === null || result.nextOffset === undefined) break
    const nextOffset = Number(result.nextOffset)
    if (!Number.isFinite(nextOffset) || nextOffset <= offset) break
    offset = nextOffset
  }

  return {
    result: {
      ...(lastResult || { ok: true }),
      ok: true,
      schools: dedupeById(items),
      hasMore: false,
      nextOffset: null,
      autoPaged: true,
      loadedPages,
    } as SchoolListResult | SchoolMarkerListResult,
    items: dedupeById(items),
  }
}

export async function getSchools(options: SchoolQueryOptions = {}) {
  const { params, cacheShape } = buildSchoolListParams(options)
  const cacheKey = getSchoolListCacheKey(cacheShape)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolListPayload>(cacheKey)
  if (cached) return okSchoolList(cached)

  const { result, items } = await fetchAllSchoolPages<SchoolItem>('getSchools', params)
  if (result.ok) {
    await setScopedCachedValue(cacheKey, { schools: items }, SCHOOL_LIST_TTL_MS)
    return { ...result, schools: items } as SchoolListResult
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

  return result as SchoolListResult
}

export async function getSchoolMarkers(options: SchoolQueryOptions = {}) {
  const { params, cacheShape } = buildSchoolListParams({ ...options, limit: options.limit || SCHOOL_PAGE_SIZE })
  const cacheKey = getSchoolMarkersCacheKey(cacheShape)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolMarkerListPayload>(cacheKey)
  if (cached) return okSchoolMarkers(cached)

  const { result, items } = await fetchAllSchoolPages<SchoolMarkerItem>('getSchoolMarkers', params)
  if (result.ok) {
    await setScopedCachedValue(cacheKey, { schools: items }, SCHOOL_MARKERS_TTL_MS)
    return { ...result, schools: items } as SchoolMarkerListResult
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

  return result as SchoolMarkerListResult
}

export async function getSchoolDetail(schoolId: number, options: { forceRefresh?: boolean } = {}) {
  const cacheKey = getSchoolDetailCacheKey(schoolId)
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolDetailPayload>(cacheKey)
  if (cached) return okSchoolDetail(cached)

  const result = await callCloud<SchoolDetailResult>('getSchoolDetail', { schoolId })
  if (result.ok) {
    await setScopedCachedValue(cacheKey, { school: result.school || null }, SCHOOL_DETAIL_TTL_MS)
    return result
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
