import { callCloud } from './cloud'
import type {
  AdminAccessResult,
  GetMeResult,
  SaveProfileResult,
  SafetyOverviewResult,
  UpdatePrivacySettingsResult,
} from '../types/domain'

export async function getMe() {
  return callCloud<GetMeResult>('getMe')
}

export async function saveProfile(data: Record<string, unknown>) {
  return callCloud<SaveProfileResult>('saveProfile', data)
}

export async function updatePrivacySettings(data: { allowIncomingRequests?: boolean; isVisibleOnMap?: boolean }) {
  return callCloud<UpdatePrivacySettingsResult>('updatePrivacySettings', data)
}

export async function getSafetyOverview() {
  return callCloud<SafetyOverviewResult>('getSafetyOverview')
}

export async function checkAdminAccess() {
  return callCloud<AdminAccessResult>('checkAdminAccess')
}
