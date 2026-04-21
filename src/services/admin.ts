import { callCloud } from './cloud'
import type { CloudResponse, EventPublishPayloadResult, EventSubmissionItem } from '../types/domain'

export async function listEventSubmissions(status: string, limit = 50) {
  return callCloud<{ submissions?: EventSubmissionItem[] }>('listEventSubmissions', { status, limit })
}

export async function getEventPublishPayload(submissionId: string) {
  return callCloud<EventPublishPayloadResult>('getEventPublishPayload', { submissionId })
}

export async function reviewEventSubmission(data: {
  submissionId: string
  action: 'mark_published' | 'reject' | 'reset_pending'
  publishedEventId?: string
  reviewedBy?: string
  adminNote?: string
}) {
  return callCloud<CloudResponse>('reviewEventSubmission', data)
}
