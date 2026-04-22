import { callCloud } from './cloud'
import type {
  GetMyRequestsResult,
  ManageConnectionResult,
  RespondRequestResult,
  SendRequestResult,
} from '../types/domain'

export async function getMyRequests() {
  return callCloud<GetMyRequestsResult>('getMyRequests')
}

export async function sendRequest(targetUserId: string) {
  return callCloud<SendRequestResult>('sendRequest', { targetUserId })
}

export async function respondRequest(requestId: string, action: 'accept' | 'reject') {
  return callCloud<RespondRequestResult>('respondRequest', { requestId, action })
}

export async function manageConnection(connectionId: string, action: 'withdraw' | 'remove_connection') {
  return callCloud<ManageConnectionResult>('manageConnection', { connectionId, action })
}
