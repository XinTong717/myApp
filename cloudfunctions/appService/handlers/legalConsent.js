const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CONSENT_COLLECTION,
  getConsentByOpenid,
} = require('../lib/legalConsent')

async function getLegalConsentStatus(event, wxContext) {
  const requestId = resolveRequestId('legal-consent-status', event)
  const openid = wxContext.OPENID
  try {
    const consent = await getConsentByOpenid(openid)
    const isCurrent = !!(
      consent &&
      consent.termsVersion === CURRENT_TERMS_VERSION &&
      consent.privacyVersion === CURRENT_PRIVACY_VERSION &&
      consent.termsAcceptedAt &&
      consent.privacyAcceptedAt &&
      consent.adultConfirmedAt
    )
    return ok(requestId, { consent: isCurrent ? consent : null })
  } catch (err) {
    console.error('appService getLegalConsentStatus error:', err)
    return fail(requestId, 'GET_LEGAL_CONSENT_FAILED', '读取确认状态失败，请稍后重试', { consent: null })
  }
}

async function recordLegalConsent(event, wxContext) {
  const requestId = resolveRequestId('record-legal-consent', event)
  const openid = wxContext.OPENID
  const termsVersion = String(event.termsVersion || '')
  const privacyVersion = String(event.privacyVersion || '')

  if (!event.termsAccepted) return fail(requestId, 'TERMS_REQUIRED', '请先阅读并同意用户协议')
  if (!event.privacyAccepted) return fail(requestId, 'PRIVACY_REQUIRED', '请先阅读并同意隐私政策')
  if (!event.adultConfirmed) return fail(requestId, 'ADULT_CONFIRMATION_REQUIRED', '当前仅支持18岁及以上用户使用')
  if (termsVersion !== CURRENT_TERMS_VERSION) return fail(requestId, 'TERMS_VERSION_OUTDATED', '用户协议版本已更新，请重新阅读并同意')
  if (privacyVersion !== CURRENT_PRIVACY_VERSION) return fail(requestId, 'PRIVACY_VERSION_OUTDATED', '隐私政策版本已更新，请重新阅读并同意')

  try {
    const now = Date.now()
    await db.collection(CONSENT_COLLECTION).doc(openid).set({
      data: {
        openid,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        termsAcceptedAt: db.serverDate(),
        privacyAcceptedAt: db.serverDate(),
        adultConfirmedAt: db.serverDate(),
        source: String(event.source || 'profile_save'),
        updatedAt: db.serverDate(),
        createdAt: db.serverDate(),
      },
    })
    return ok(requestId, {
      consent: {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        adultConfirmedAt: now,
      },
    })
  } catch (err) {
    console.error('appService recordLegalConsent error:', err)
    return fail(requestId, 'RECORD_LEGAL_CONSENT_FAILED', '确认失败，请稍后重试')
  }
}

module.exports = {
  getLegalConsentStatus,
  recordLegalConsent,
}
