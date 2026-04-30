const READ_ACTION_RATE_LIMITS = {
  getMapUsers: { limit: 30, windowMs: 60 * 1000 },
  getMyRequests: { limit: 30, windowMs: 60 * 1000 },
  getEventInterestInfo: { limit: 60, windowMs: 60 * 1000 },
  getEvents: { limit: 60, windowMs: 60 * 1000 },
  getSchools: { limit: 60, windowMs: 60 * 1000 },
}

module.exports = {
  READ_ACTION_RATE_LIMITS,
}
