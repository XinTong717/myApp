export type CloudResponse<T = Record<string, unknown>> = T & {
  ok?: boolean
  message?: string
}

export type EventItem = {
  id: number
  title: string
  event_type: string
  description?: string
  start_time?: string
  end_time?: string
  location?: string
  fee?: string
  status?: string
  organizer?: string
  is_online?: boolean
}

export type SchoolItem = {
  id: number
  name: string
  province?: string
  city?: string
  age_range?: string
  school_type?: string
  has_xuji?: boolean
  xuji_note?: string
  residency_req?: string
  admission_req?: string
  fee?: string
  output_direction?: string
  official_url?: string
}

export type ContactInfoResult = CloudResponse<{
  contactInfo?: string
  publicSignupInfo?: {
    officialUrl?: string
    signupNote?: string
  }
  needCompleteProfile?: boolean
}>

export type EventInterestInfoResult = CloudResponse<{
  count?: number
  hasInterested?: boolean
}>

export type ToggleEventInterestResult = CloudResponse<{
  hasInterested?: boolean
}>

export type UserProfile = {
  displayName?: string
  gender?: string
  ageRange?: string
  roles?: string[]
  province?: string
  city?: string
  wechatId?: string
  allowIncomingRequests?: boolean
  isVisibleOnMap?: boolean
  childAgeRange?: string[]
  childDropoutStatus?: string[]
  childInterests?: string
  eduServices?: string
  companionContext?: string
  bio?: string
  createdAt?: string
  updatedAt?: string
}

export type SafetyItem = {
  _id: string
  targetUserId: string
  targetName: string
  targetCity: string
  isBlocked: boolean
  isMuted: boolean
}

export type PendingRequest = {
  _id: string
  fromUserId: string
  fromName: string
  fromCity: string
  fromRoles: string[]
  fromBio: string
  createdAt: string
}

export type AcceptedConnection = {
  _id: string
  otherUserId: string
  otherName: string
  otherCity: string
  otherRoles: string[]
  otherBio: string
  otherWechat: string
  otherChildInfo: {
    ageRange: string[]
    status: string[]
    interests: string
  } | null
  otherEduServices: string
}

export type SentRequest = {
  _id: string
  toUserId: string
  toName: string
  toCity: string
  status: string
  createdAt: string
}

export type GetMyRequestsResult = CloudResponse<{
  pending?: PendingRequest[]
  accepted?: AcceptedConnection[]
  sent?: SentRequest[]
}>

export type SimpleActionResult = CloudResponse<Record<string, never>>

export type EventSubmissionItem = {
  _id: string
  status: string
  title: string
  province: string
  city: string
  eventType: string
  organizer: string
  startTime: string
  endTime: string
  isOnline: boolean
  fee: string
  officialUrl: string
  submitterDisplayName: string
  submitterCity: string
  createdAt: string | null
  publishedEventId: number | null
  adminNote: string
}

export type EventPublishPayloadResult = CloudResponse<{
  suggestedEventPayload?: Record<string, unknown>
  warnings?: string[]
}>
