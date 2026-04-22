import { callCloud } from './cloud'
import type { ManageSafetyRelationResult, ReportUserResult } from '../types/domain'

export async function reportUser(targetUserId: string, reason: string, note = '') {
  return callCloud<ReportUserResult>('reportUser', { targetUserId, reason, note })
}

export async function manageSafetyRelation(targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') {
  return callCloud<ManageSafetyRelationResult>('manageSafetyRelation', { targetUserId, action })
}
