export const CURRENT_TERMS_VERSION = '2026-05-01'
export const CURRENT_PRIVACY_VERSION = '2026-05-01'

export const LEGAL_CONSENT_STORAGE_KEY = 'legal-consent:v1'

export type LegalConsentCache = {
  termsVersion: string
  privacyVersion: string
  termsAcceptedAt: number
  privacyAcceptedAt: number
  adultConfirmedAt: number
}

export function isCurrentLegalConsent(value: Partial<LegalConsentCache> | null | undefined) {
  return !!(
    value &&
    value.termsVersion === CURRENT_TERMS_VERSION &&
    value.privacyVersion === CURRENT_PRIVACY_VERSION &&
    value.termsAcceptedAt &&
    value.privacyAcceptedAt &&
    value.adultConfirmedAt
  )
}
