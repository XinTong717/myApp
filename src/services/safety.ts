import { callCloud } from './cloud'
import type { CloudResponse } from '../types/domain'

export async function reportUser(targetUserId: string, reason: string, note = '') {
  return callCloud<CloudResponse>('reportUser', { targetUserId, reason, note })
}

export async function manageSafetyRelation(targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') {
  return callCloud<CloudResponse>('manageSafetyRelation', { targetUserId, action })
}
