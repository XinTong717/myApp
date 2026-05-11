const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

const READ_ACTION_RATE_LIMITS = {
  getOpenId: { limit: 30, windowMs: MINUTE },
  getMe: { limit: 60, windowMs: MINUTE },
  getProfileBootstrap: { limit: 30, windowMs: MINUTE },
  getFilterOptions: { limit: 30, windowMs: MINUTE },
  getMapUsers: { limit: 30, windowMs: MINUTE },
  getSafetyOverview: { limit: 30, windowMs: MINUTE },
  getLegalConsentStatus: { limit: 30, windowMs: MINUTE },
  getEventInterestInfo: { limit: 60, windowMs: MINUTE },
  getEventInterestCountsBatch: { limit: 60, windowMs: MINUTE },
  getMyFavoriteEvents: { limit: 60, windowMs: MINUTE },
  getEventContactInfo: { limit: 30, windowMs: MINUTE },
  getEvents: { limit: 60, windowMs: MINUTE },
  getEventDetail: { limit: 120, windowMs: MINUTE },
  getSchools: { limit: 60, windowMs: MINUTE },
  getSchoolMarkers: { limit: 60, windowMs: MINUTE },
  getSchoolDetail: { limit: 120, windowMs: MINUTE },
}

const WRITE_ACTION_RATE_LIMITS = {
  recordLegalConsent: { limit: 10, windowMs: DAY },
  submitCorrection: { limit: 5, windowMs: DAY },
  submitSchool: { limit: 5, windowMs: DAY },
  submitEvent: { limit: 5, windowMs: DAY },
  manageSafetyRelation: { limit: 30, windowMs: DAY },
  reportUser: { limit: 10, windowMs: DAY },
  toggleEventInterest: { limit: 60, windowMs: MINUTE },
  updatePrivacySettings: { limit: 30, windowMs: DAY },
  saveProfile: { limit: 20, windowMs: DAY },
  requestAccountDeletion: { limit: 3, windowMs: DAY },
}

const ADMIN_ACTION_RATE_LIMITS = {
  checkAdminAccess: { limit: 30, windowMs: MINUTE },
  publishEventDirect: { limit: 30, windowMs: MINUTE },
  reviewEventSubmission: { limit: 60, windowMs: MINUTE },
  getEventPublishPayload: { limit: 120, windowMs: MINUTE },
  listEventSubmissions: { limit: 120, windowMs: MINUTE },
  listSchoolSubmissions: { limit: 120, windowMs: MINUTE },
  reviewSchoolSubmission: { limit: 60, windowMs: MINUTE },
}

const ACTION_RATE_LIMITS = {
  ...READ_ACTION_RATE_LIMITS,
  ...WRITE_ACTION_RATE_LIMITS,
  ...ADMIN_ACTION_RATE_LIMITS,
}

module.exports = {
  ACTION_RATE_LIMITS,
  READ_ACTION_RATE_LIMITS,
  WRITE_ACTION_RATE_LIMITS,
  ADMIN_ACTION_RATE_LIMITS,
}
