import { callCloud } from './cloud'
import type {
  CloudResponse,
  ContactInfoResult,
  EventInterestInfoResult,
  EventItem,
  ToggleEventInterestResult,
} from '../types/domain'

export async function getEvents() {
  return callCloud<{ events?: EventItem[] }>('getEvents')
}

export async function getEventDetail(eventId: number) {
  return callCloud<{ event?: EventItem | null }>('getEventDetail', { eventId })
}

export async function getEventInterestCountsBatch(eventIds: number[]) {
  return callCloud<{ counts?: Record<number, number> }>('getEventInterestCountsBatch', { eventIds })
}

export async function getEventInterestInfo(eventId: number) {
  return callCloud<EventInterestInfoResult>('getEventInterestInfo', { eventId })
}

export async function toggleEventInterest(eventId: number) {
  return callCloud<ToggleEventInterestResult>('toggleEventInterest', { eventId })
}

export async function getEventContactInfo(eventId: number) {
  return callCloud<ContactInfoResult>('getEventContactInfo', { eventId })
}

export async function submitEvent(data: Record<string, unknown>) {
  return callCloud<CloudResponse>('submitEvent', data)
}
