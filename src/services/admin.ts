import { callCloud } from './cloud'

export async function listEventSubmissions(status: string, limit = 50) {
  return callCloud<any>('listEventSubmissions', { status, limit })
}

export async function getEventPublishPayload(submissionId: string) {
  return callCloud<any>('getEventPublishPayload', { submissionId })
}

export async function reviewEventSubmission(data: {
  submissionId: string
  action: 'mark_published' | 'reject' | 'reset_pending'
  publishedEventId?: string
  reviewedBy?: string
  adminNote?: string
}) {
  return callCloud<any>('reviewEventSubmission', data)
}
