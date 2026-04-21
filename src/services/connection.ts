import { callCloud } from './cloud'
import type { CloudResponse, GetMyRequestsResult } from '../types/domain'

export async function getMyRequests() {
  return callCloud<GetMyRequestsResult>('getMyRequests')
}

export async function sendRequest(targetUserId: string) {
  return callCloud<CloudResponse>('sendRequest', { targetUserId })
}

export async function respondRequest(requestId: string, action: 'accept' | 'reject') {
  return callCloud<CloudResponse>('respondRequest', { requestId, action })
}

export async function manageConnection(connectionId: string, action: 'withdraw' | 'remove_connection') {
  return callCloud<CloudResponse>('manageConnection', { connectionId, action })
}
