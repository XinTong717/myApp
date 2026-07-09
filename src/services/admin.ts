import { callCloud } from './cloud'
import type {
  EventPublishPayloadResult,
  ListEventSubmissionsResult,
  ListSchoolSubmissionsResult,
  ReviewEventSubmissionResult,
  ReviewSchoolSubmissionResult,
  SchoolPublishPayloadResult,
  SchoolPublishPreviewResult,
  PublishSchoolDirectResult,
} from '../types/domain'

export async function listEventSubmissions(status: string, limit = 50) {
  return callCloud<ListEventSubmissionsResult>('listEventSubmissions', { status, limit })
}

export async function getEventPublishPayload(submissionId: string) {
  return callCloud<EventPublishPayloadResult>('getEventPublishPayload', { submissionId })
}

export async function reviewEventSubmission(data: {
  submissionId: string
  reviewAction: 'mark_published' | 'reject' | 'reset_pending'
  publishedEventId?: string
  adminNote?: string
}) {
  return callCloud<ReviewEventSubmissionResult>('reviewEventSubmission', data)
}

export async function listSchoolSubmissions(status: string, limit = 50) {
  return callCloud<ListSchoolSubmissionsResult>('listSchoolSubmissions', { status, limit })
}

export async function getSchoolPublishPayload(submissionId: string) {
  return callCloud<SchoolPublishPayloadResult>('getSchoolPublishPayload', { submissionId })
}

export async function getSchoolPublishPreview(submissionId: string) {
  return callCloud<SchoolPublishPreviewResult>('getSchoolPublishPreview', { submissionId })
}

export async function publishSchoolDirect(data: {
  submissionId: string
  adminNote?: string
  duplicateResolution?: 'continue' | 'merge'
  mergeSchoolId?: number
}) {
  return callCloud<PublishSchoolDirectResult>('publishSchoolDirect', data)
}

export async function reviewSchoolSubmission(data: {
  submissionId: string
  reviewAction: 'mark_processed' | 'reject' | 'duplicate' | 'reset_pending'
  adminNote?: string
}) {
  return callCloud<ReviewSchoolSubmissionResult>('reviewSchoolSubmission', data)
}
