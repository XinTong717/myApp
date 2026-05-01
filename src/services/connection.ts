import { callCloud } from './cloud'
import type {
  GetMyRequestsResult,
  ManageConnectionResult,
  RespondRequestResult,
  SendRequestResult,
} from '../types/domain'

export type RequestSection = 'pending' | 'accepted' | 'sent' | 'all'

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

export async function getMyRequests(section: RequestSection = 'all', options: { offset?: number; limit?: number } = {}) {
  return callCloud<GetMyRequestsResult>('getMyRequests', {
    section,
    ...(options.offset ? { offset: options.offset } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  })
}

export async function sendRequest(targetUserId: string) {
  return runExclusive(`sendRequest:${targetUserId}`, () => callCloud<SendRequestResult>('sendRequest', { targetUserId }))
}

export async function respondRequest(requestId: string, action: 'accept' | 'reject') {
  return runExclusive(`respondRequest:${requestId}:${action}`, () => callCloud<RespondRequestResult>('respondRequest', { requestId, action }))
}

export async function manageConnection(connectionId: string, action: 'withdraw' | 'remove_connection') {
  return runExclusive(`manageConnection:${connectionId}:${action}`, () => callCloud<ManageConnectionResult>('manageConnection', { connectionId, action }))
}
