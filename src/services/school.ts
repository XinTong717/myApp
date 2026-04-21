import { callCloud } from './cloud'

export async function getSchools() {
  return callCloud<{ ok: boolean; schools?: any[]; message?: string }>('getSchools')
}

export async function getSchoolDetail(schoolId: number) {
  return callCloud<{ ok: boolean; school?: any; message?: string }>('getSchoolDetail', { schoolId })
}
