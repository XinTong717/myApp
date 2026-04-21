import { callCloud } from './cloud'
import type { CloudResponse, SchoolItem } from '../types/domain'

export async function getSchools() {
  return callCloud<{ schools?: SchoolItem[] }>('getSchools')
}

export async function getSchoolDetail(schoolId: number) {
  return callCloud<{ school?: SchoolItem | null }>('getSchoolDetail', { schoolId })
}

export async function submitCommunity(data: Record<string, unknown>) {
  return callCloud<CloudResponse>('submitCommunity', data)
}

export async function submitCorrection(schoolId: number, schoolName: string, content: string) {
  return callCloud<CloudResponse>('submitCorrection', { schoolId, schoolName, content })
}
