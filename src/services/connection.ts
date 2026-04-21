import { callCloud } from './cloud'

export async function getMyRequests() {
  return callCloud<any>('getMyRequests')
}

export async function sendRequest(targetUserId: string) {
  return callCloud<any>('sendRequest', { targetUserId })
}

export async function respondRequest(requestId: string, action: 'accept' | 'reject') {
  return callCloud<any>('respondRequest', { requestId, action })
}

export async function manageConnection(connectionId: string, action: 'withdraw' | 'remove_connection') {
  return callCloud<any>('manageConnection', { connectionId, action })
}
