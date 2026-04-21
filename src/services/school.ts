import { callCloud } from './cloud'
import { fetchSchoolById, fetchSchools } from './api'

export async function getSchools() {
  const schools = await fetchSchools()
  return { ok: true, schools: Array.isArray(schools) ? schools : [] }
}

export async function getSchoolDetail(schoolId: number) {
  const school = await fetchSchoolById(schoolId)
  return { ok: true, school }
}

export async function submitCommunity(data: Record<string, any>) {
  return callCloud<any>('submitCommunity', data)
}

export async function submitCorrection(schoolId: number, schoolName: string, content: string) {
  return callCloud<any>('submitCorrection', { schoolId, schoolName, content })
}
