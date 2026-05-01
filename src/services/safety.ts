import { callCloud } from './cloud'
import type { ManageSafetyRelationResult, ReportUserResult } from '../types/domain'

const pendingActionKeys = new Set<string>()

async function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingActionKeys.has(key)) {
    return {
      ok: false,
      code: 'DUPLICATE_CLIENT_ACTION',
      message: '操作正在处理中，请勿重复点击',
    } as T
  }

  pendingActionKeys.add(key)
  try {
    return await fn()
  } finally {
    pendingActionKeys.delete(key)
  }
}

export async function reportUser(targetUserId: string, reason: string, note = '') {
  return runExclusive(`reportUser:${targetUserId}`, () => callCloud<ReportUserResult>('reportUser', { targetUserId, reason, note }))
}

export async function manageSafetyRelation(targetUserId: string, action: 'block' | 'unblock' | 'mute' | 'unmute') {
  return runExclusive(`manageSafetyRelation:${targetUserId}:${action}`, () => callCloud<ManageSafetyRelationResult>('manageSafetyRelation', { targetUserId, action }))
}
