import { callCloud } from './cloud'
import type {
  CloudResponse,
  ContactInfoResult,
  EventDetailResult,
  EventInterestCountsBatchResult,
  EventInterestInfoResult,
  EventListResult,
  ToggleEventInterestResult,
} from '../types/domain'

export async function getEvents() {
  return callCloud<EventListResult>('getEvents')
}

export async function getEventDetail(eventId: number) {
  return callCloud<EventDetailResult>('getEventDetail', { eventId })
}

export async function getEventInterestCountsBatch(eventIds: number[]) {
  return callCloud<EventInterestCountsBatchResult>('getEventInterestCountsBatch', { eventIds })
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
