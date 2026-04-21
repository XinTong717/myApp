import { callCloud } from './cloud'

export type UserProfile = {
  displayName?: string
  gender?: string
  ageRange?: string
  roles?: string[]
  province?: string
  city?: string
  wechatId?: string
  allowIncomingRequests?: boolean
  isVisibleOnMap?: boolean
  childAgeRange?: string[]
  childDropoutStatus?: string[]
  childInterests?: string
  eduServices?: string
  companionContext?: string
  bio?: string
  createdAt?: string
  updatedAt?: string
}

export async function getMe() {
  return callCloud<{ profile: UserProfile | null }>('getMe')
}

export async function saveProfile(data: Record<string, any>) {
  return callCloud<{ ok: boolean; mode?: 'create' | 'update'; message?: string }>('saveProfile', data)
}

export async function updatePrivacySettings(data: { allowIncomingRequests?: boolean; isVisibleOnMap?: boolean }) {
  return callCloud<{ ok: boolean; message?: string }>('updatePrivacySettings', data)
}

export async function getSafetyOverview() {
  return callCloud<{ ok: boolean; blocked?: any[]; muted?: any[] }>('getSafetyOverview')
}

export async function checkAdminAccess() {
  return callCloud<{ ok: boolean; isAdmin?: boolean; admin?: { name?: string } }>('checkAdminAccess')
}
