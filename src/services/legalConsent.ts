import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_CONSENT_STORAGE_KEY,
  type LegalConsentCache,
  isCurrentLegalConsent,
} from '../constants/legal'

const APP_SERVICE_NAME = 'appService'

type LegalConsentPayload = {
  consent?: LegalConsentCache | null
}

export type LegalConsentStatusResult = CloudResponse<LegalConsentPayload>
export type RecordLegalConsentResult = CloudResponse<LegalConsentPayload>

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeConsentCache(raw: any): LegalConsentCache | null {
  if (!raw) return null
  return {
    termsVersion: String(raw.termsVersion || ''),
    privacyVersion: String(raw.privacyVersion || ''),
    termsAcceptedAt: Number(raw.termsAcceptedAt || 0),
    privacyAcceptedAt: Number(raw.privacyAcceptedAt || 0),
    adultConfirmedAt: Number(raw.adultConfirmedAt || 0),
  }
}

export function getLocalLegalConsent() {
  try {
    return normalizeConsentCache(Taro.getStorageSync(LEGAL_CONSENT_STORAGE_KEY))
  } catch (err) {
    return null
  }
}

export function hasCurrentLocalLegalConsent() {
  return isCurrentLegalConsent(getLocalLegalConsent())
}

export function setLocalLegalConsent(consent: LegalConsentCache) {
  try {
    Taro.setStorageSync(LEGAL_CONSENT_STORAGE_KEY, consent)
  } catch (err) {
    console.warn('[legal-consent] failed to persist local consent', err)
  }
}

export function clearLocalLegalConsent() {
  try {
    Taro.removeStorageSync(LEGAL_CONSENT_STORAGE_KEY)
  } catch (err) {
    console.warn('[legal-consent] failed to clear local consent', err)
  }
}

async function callLegalConsentAction(action: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(action)
  try {
    const res = await Taro.cloud.callFunction({
      name: APP_SERVICE_NAME,
      data: { action, ...data, clientRequestId },
    })
    const result = ((res.result || {}) as CloudResponse<LegalConsentPayload>) || ({ ok: false } as CloudResponse<LegalConsentPayload>)
    if (!result.requestId) result.requestId = clientRequestId
    if (typeof result.ok !== 'boolean') {
      result.ok = false
      result.code = result.code || 'INVALID_CLOUD_RESPONSE'
      result.message = result.message || '服务返回格式异常，请稍后重试'
    }
    if (result.consent) {
      result.consent = normalizeConsentCache(result.consent)
    }
    return result
  } catch (err) {
    console.error(`[legal-consent] ${action} error:`, err)
    return {
      ok: false,
      code: 'CLOUD_CALL_FAILED',
      requestId: clientRequestId,
      message: '网络异常，请稍后重试',
    } as CloudResponse<LegalConsentPayload>
  }
}

export async function recordLegalConsent(): Promise<RecordLegalConsentResult> {
  const result = await callLegalConsentAction('recordLegalConsent', {
    termsAccepted: true,
    privacyAccepted: true,
    adultConfirmed: true,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
    source: 'profile_save',
  })

  if (result.ok && result.consent && isCurrentLegalConsent(result.consent)) {
    setLocalLegalConsent(result.consent)
  }

  return result
}

export async function syncLegalConsentStatus(): Promise<LegalConsentStatusResult> {
  const result = await callLegalConsentAction('getLegalConsentStatus', {
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
  })

  if (result.ok && result.consent && isCurrentLegalConsent(result.consent)) {
    setLocalLegalConsent(result.consent)
  } else if (result.ok && !result.consent) {
    clearLocalLegalConsent()
  }

  return result
}
