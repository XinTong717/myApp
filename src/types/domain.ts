export type CloudResponse<T = Record<string, unknown>> = T & {
  ok: boolean
  message?: string
  code?: string
  requestId?: string
  stale?: boolean
  degraded?: boolean
}

export type SimpleActionResult = CloudResponse<Record<string, never>>

export type EventItem = {
  id: number
  title: string
  province?: string
  city?: string
  event_type: string
  event_types?: string[]
  audience_who?: string[]
  min_age_requirement?: string
  max_age_requirement?: string
  signup_deadline?: string
  is_recurring?: boolean
  recurrence_pattern?: string
  fee_category?: string
  description?: string
  start_time?: string
  end_time?: string
  location?: string
  fee?: string
  status?: string
  organizer?: string
  is_online?: boolean
  contact_info?: string
  interest_count?: number
}

export type EventListResult = CloudResponse<{
  events?: EventItem[]
}>

export type EventDetailResult = CloudResponse<{
  event?: EventItem | null
}>

export type EventInterestCountsBatchResult = CloudResponse<{
  counts?: Record<number, number>
}>

export type MapProvinceStat = {
  province: string
  count: number
}

export type MapUser = {
  _id: string
  displayName?: string
  roles?: string[]
  province?: string
  city?: string
  bio?: string
  companionContext?: string
  publicChannel?: string
  publicChannelNote?: string
  childAgeRange?: string[]
  childDropoutStatus?: string[]
  childInterests?: string
  eduServices?: string
  hasExpandedProfile?: boolean
  isSelf?: boolean
}

export type GetMapUsersResult = CloudResponse<{
  users?: MapUser[]
  provinceStats?: MapProvinceStat[]
  province?: string
  mode?: 'province_summary' | 'province_detail'
  limit?: number
  offset?: number
  nextOffset?: number | null
  hasMore?: boolean
  autoPaged?: boolean
  loadedPages?: number
  loadedUserCount?: number
}>

export type SchoolLocationItem = {
  school_id: number
  province?: string
  city?: string
  address_note?: string
  contact_note?: string
  status?: string
  source?: string
}

export type SchoolMarkerLocationItem = Pick<SchoolLocationItem, 'school_id' | 'province' | 'city' | 'status'>

export type SchoolItem = {
  id: number
  name: string
  canonical_name?: string
  description?: string
  province?: string
  city?: string
  locations?: SchoolLocationItem[]
  location_count?: number
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

export type SchoolMarkerItem = {
  id: number
  name?: string
  canonical_name?: string
  province?: string
  city?: string
  locations?: SchoolMarkerLocationItem[]
  location_count?: number
}

export type SchoolListResult = CloudResponse<{
  schools?: SchoolItem[]
}>

export type SchoolMarkerListResult = CloudResponse<{
  schools?: SchoolMarkerItem[]
}>

export type SchoolDetailResult = CloudResponse<{
  school?: SchoolItem | null
}>

export type SubmitSchoolResult = SimpleActionResult

export type SubmitCorrectionResult = SimpleActionResult

export type ContactInfoResult = CloudResponse<{
  contactInfo?: string
  publicSignupInfo?: {
    officialUrl?: string
    signupNote?: string
  }
  needCompleteProfile?: boolean
  privateContactRequiresProfile?: boolean
}>

export type EventInterestInfoResult = CloudResponse<{
  count?: number
  hasInterested?: boolean
}>

export type ToggleEventInterestResult = CloudResponse<{
  hasInterested?: boolean
  count?: number
  delta?: number
}>

export type UserProfile = {
  displayName?: string
  gender?: string
  ageRange?: string
  roles?: string[]
  province?: string
  city?: string
  publicChannel?: string
  publicChannelNote?: string
  expandedProfileVisible?: boolean
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

export type GetMeResult = CloudResponse<{
  profile?: UserProfile | null
}>

export type SaveProfileResult = CloudResponse<{
  mode?: 'create' | 'update'
  profile?: UserProfile | null
}>

export type UpdatePrivacySettingsResult = SimpleActionResult

export type AdminAccessResult = CloudResponse<{
  isAdmin?: boolean
  admin?: { name?: string; role?: string } | null
}>

export type SafetyItem = {
  _id: string
  targetUserId: string
  targetName: string
  targetCity: string
  isBlocked: boolean
  isMuted: boolean
}

export type SafetyOverviewResult = CloudResponse<{
  blocked?: SafetyItem[]
  muted?: SafetyItem[]
}>

export type ManageSafetyRelationResult = SimpleActionResult

export type ReportUserResult = SimpleActionResult

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
  descriptionPreview?: string
  submitterDisplayName: string
  submitterCity: string
  createdAt: string | null
  publishedEventId: number | null
  adminNote: string
  contentSecurityStatus?: string
}

export type SchoolSubmissionItem = {
  _id: string
  status: string
  name: string
  province?: string
  city?: string
  schoolType?: string
  schoolTypes?: string[]
  ageRange?: string
  ageRanges?: string[]
  officialUrl?: string
  publicAccountNote?: string
  xujiNote?: string
  residencyReq?: string
  admissionReq?: string
  participationNote?: string
  feeNote?: string
  outputDirection?: string
  sourceNote?: string
  recommendationNote?: string
  submitterDisplayName?: string
  submitterCity?: string
  createdAt?: string | null
  reviewedAt?: string | null
  reviewedBy?: string
  adminNote?: string
  contentSecurityStatus?: string
}

export type ListEventSubmissionsResult = CloudResponse<{
  submissions?: EventSubmissionItem[]
  admin?: { name?: string; role?: string }
}>

export type ListSchoolSubmissionsResult = CloudResponse<{
  submissions?: SchoolSubmissionItem[]
  admin?: { name?: string; role?: string }
}>

export type ReviewEventSubmissionResult = CloudResponse<{
  nextStatus?: string
  publishedEventId?: number
}>

export type ReviewSchoolSubmissionResult = CloudResponse<{
  nextStatus?: string
}>

export type EventPublishPayloadResult = CloudResponse<{
  submission?: Record<string, unknown>
  suggestedEventPayload?: Record<string, unknown>
  suggestedReviewUpdate?: Record<string, unknown>
  warnings?: string[]
  admin?: { name?: string; role?: string }
}>

export type SchoolPublishPayloadResult = CloudResponse<{
  submissionId?: string
  schoolPayload?: Record<string, unknown>
  locationPayload?: Record<string, unknown>
  auditOnly?: Record<string, unknown>
  warnings?: string[]
  admin?: { name?: string; role?: string }
}>
