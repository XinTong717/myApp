import { callCloud } from './cloud'

export async function reportUser(targetUserId: string, reason: string, note = '') {
  return callCloud<any>('reportUser', { targetUserId, reason, note })
}

export async function manageSafetyRelation(targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') {
  return callCloud<any>('manageSafetyRelation', { targetUserId, action })
}
