const { db } = require('./cloud')

const CURRENT_TERMS_VERSION = '2026-05-08'
const CURRENT_PRIVACY_VERSION = '2026-05-08'
const CONSENT_COLLECTION = 'user_consents'

function normalizeServerDate(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return date instanceof Date ? date.getTime() : 0
  }
  if (typeof value.getTime === 'function') return value.getTime()
  if (typeof value._seconds === 'number') return value._seconds * 1000
  return 0
}

function normalizeConsent(raw) {
  if (!raw) return null
  return {
    termsVersion: String(raw.termsVersion || ''),
    privacyVersion: String(raw.privacyVersion || ''),
    termsAcceptedAt: normalizeServerDate(raw.termsAcceptedAt),
    privacyAcceptedAt: normalizeServerDate(raw.privacyAcceptedAt),
    adultConfirmedAt: normalizeServerDate(raw.adultConfirmedAt),
  }
}

function isCurrentConsent(consent) {
  return !!(
    consent &&
    consent.termsVersion === CURRENT_TERMS_VERSION &&
    consent.privacyVersion === CURRENT_PRIVACY_VERSION &&
    consent.termsAcceptedAt &&
    consent.privacyAcceptedAt &&
    consent.adultConfirmedAt
  )
}

async function getConsentByOpenid(openid) {
  try {
    const res = await db.collection(CONSENT_COLLECTION).doc(openid).get()
    return normalizeConsent(res.data || null)
  } catch (err) {
    return null
  }
}

async function hasCurrentConsent(openid) {
  const consent = await getConsentByOpenid(openid)
  return isCurrentConsent(consent)
}

module.exports = {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CONSENT_COLLECTION,
  normalizeConsent,
  isCurrentConsent,
  getConsentByOpenid,
  hasCurrentConsent,
}
