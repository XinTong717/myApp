import { callCloud } from './cloud'
import { fetchEventById, fetchEvents } from './api'

export async function getEvents() {
  const events = await fetchEvents()
  return { ok: true, events: Array.isArray(events) ? events : [] }
}

export async function getEventDetail(eventId: number) {
  const event = await fetchEventById(eventId)
  return { ok: true, event }
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
