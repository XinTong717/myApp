import { callCloud } from './cloud'
import { clearSafetyOverviewCache } from './profile'
import { runExclusive } from './internal/runExclusive'
import type { ManageSafetyRelationResult, ReportUserResult } from '../types/domain'

export async function reportUser(targetUserId: string, reason: string, note = '') {
  return runExclusive(`reportUser:${targetUserId}`, () => callCloud<ReportUserResult>('reportUser', { targetUserId, reason, note }))
}

export async function manageSafetyRelation(targetUserId: string, relationAction: 'block' | 'unblock' | 'mute' | 'unmute') {
  const result = await runExclusive(
    `manageSafetyRelation:${targetUserId}:${relationAction}`,
    () => callCloud<ManageSafetyRelationResult>('manageSafetyRelation', { targetUserId, relationAction }),
  )
  if (result.ok) {
    await clearSafetyOverviewCache()
  }
  return result
}
