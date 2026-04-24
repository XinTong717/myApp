import { callCloud } from './cloud'
import { getScopedCachedValue, setScopedCachedValue } from './cache'
import type {
  SchoolDetailResult,
  SchoolListResult,
  SubmitCommunityResult,
  SubmitCorrectionResult,
} from '../types/domain'

const SCHOOL_LIST_CACHE_KEY = 'cloud-cache:schools:list:v1'
const SCHOOL_LIST_TTL_MS = 60 * 60 * 1000

export async function getSchools(options: { forceRefresh?: boolean } = {}) {
  const cached = options.forceRefresh ? null : await getScopedCachedValue<SchoolListResult>(SCHOOL_LIST_CACHE_KEY)
  if (cached) {
    return cached
  }

  const result = await callCloud<SchoolListResult>('getSchools')
  if (result.ok) {
    await setScopedCachedValue(SCHOOL_LIST_CACHE_KEY, result, SCHOOL_LIST_TTL_MS)
    return result
  }

  const staleCached = await getScopedCachedValue<SchoolListResult>(SCHOOL_LIST_CACHE_KEY)
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

export async function getSchoolDetail(schoolId: number) {
  return callCloud<SchoolDetailResult>('getSchoolDetail', { schoolId })
}

export async function submitCommunity(data: Record<string, unknown>) {
  return callCloud<SubmitCommunityResult>('submitCommunity', data)
}

export async function submitCorrection(schoolId: number, schoolName: string, content: string) {
  return callCloud<SubmitCorrectionResult>('submitCorrection', { schoolId, schoolName, content })
}
