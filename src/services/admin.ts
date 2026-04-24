import { callCloud } from './cloud'
import type {
  EventPublishPayloadResult,
  ListEventSubmissionsResult,
  ReviewEventSubmissionResult,
} from '../types/domain'

export async function listEventSubmissions(status: string, limit = 50) {
  return callCloud<ListEventSubmissionsResult>('listEventSubmissions', { status, limit })
}

export async function getEventPublishPayload(submissionId: string) {
  return callCloud<EventPublishPayloadResult>('getEventPublishPayload', { submissionId })
}

export async function reviewEventSubmission(data: {
  submissionId: string
  action: 'mark_published' | 'reject' | 'reset_pending'
  publishedEventId?: string
  adminNote?: string
}) {
  return callCloud<ReviewEventSubmissionResult>('reviewEventSubmission', data)
}
