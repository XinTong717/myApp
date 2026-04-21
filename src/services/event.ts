import { callCloud } from './cloud'

export async function getEvents() {
    return callCloud<{ ok: boolean; events?: any[]; message?: string }>('getEvents')
  }
  
  export async function getEventDetail(eventId: number) {
    return callCloud<{ ok: boolean; event?: any; message?: string }>('getEventDetail', { eventId })
  }

export async function getEventInterestCountsBatch(eventIds: number[]) {
  return callCloud<any>('getEventInterestCountsBatch', { eventIds })
}

export async function getEventInterestInfo(eventId: number) {
  return callCloud<any>('getEventInterestInfo', { eventId })
}

export async function toggleEventInterest(eventId: number) {
  return callCloud<any>('toggleEventInterest', { eventId })
}

export async function getEventContactInfo(eventId: number) {
  return callCloud<any>('getEventContactInfo', { eventId })
}

export async function submitEvent(data: Record<string, any>) {
  return callCloud<any>('submitEvent', data)
}
