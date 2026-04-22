import { callCloud } from './cloud'
import type {
  SchoolDetailResult,
  SchoolListResult,
  SubmitCommunityResult,
  SubmitCorrectionResult,
} from '../types/domain'

export async function getSchools() {
  return callCloud<SchoolListResult>('getSchools')
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
