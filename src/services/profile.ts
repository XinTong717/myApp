import { callCloud } from './cloud'
import type { SafetyItem, UserProfile } from '../types/domain'

export async function getMe() {
  return callCloud<{ profile: UserProfile | null }>('getMe')
}

export async function saveProfile(data: Record<string, unknown>) {
  return callCloud<{ mode?: 'create' | 'update' }>('saveProfile', data)
}

export async function updatePrivacySettings(data: { allowIncomingRequests?: boolean; isVisibleOnMap?: boolean }) {
  return callCloud<Record<string, never>>('updatePrivacySettings', data)
}

export async function getSafetyOverview() {
  return callCloud<{ blocked?: SafetyItem[]; muted?: SafetyItem[] }>('getSafetyOverview')
}

export async function checkAdminAccess() {
  return callCloud<{ isAdmin?: boolean; admin?: { name?: string } }>('checkAdminAccess')
}
