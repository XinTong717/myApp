import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'

const APP_SERVICE_NAME = 'appService'
const LEGAL_CONSENT_REQUIRED_CODE = 'LEGAL_CONSENT_REQUIRED'
const PROFILE_TAB_URL = '/pages/profile/index'

let lastConsentRedirectAt = 0

// Keep this list explicit. scripts/check-action-manifest.cjs parses literal
// strings from ROUTED_ACTIONS to verify client/server/rate-limit consistency.
const ROUTED_ACTIONS = new Set([
  'getOpenId',
  'getFilterOptions',
  'getSchools',
  'getSchoolMarkers',
  'getSchoolDetail',
  'getEvents',
  'getEventDetail',
  'submitCorrection',
  'submitSchool',
  'submitEvent',
  'getEventInterestCountsBatch',
  'getEventInterestInfo',
  'toggleEventInterest',
  'getMyFavoriteEvents',
  'getEventContactInfo',
  'getMe',
  'getProfileBootstrap',
  'saveProfile',
  'updatePrivacySettings',
  'requestAccountDeletion',
  'getSafetyOverview',
  'getMapUsers',
  'manageSafetyRelation',
  'reportUser',
  'checkAdminAccess',
  'recordLegalConsent',
  'getLegalConsentStatus',
  'listEventSubmissions',
  'getEventPublishPayload',
  'publishEventDirect',
  'reviewEventSubmission',
  'listSchoolSubmissions',
  'getSchoolPublishPayload',
  'reviewSchoolSubmission',
  'logClientError',
])

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function handleLegalConsentRequired() {
  const now = Date.now()
  if (now - lastConsentRedirectAt < 1500) return

  lastConsentRedirectAt = now
  Taro.showToast({ title: '请先在“我的”页阅读并同意协议', icon: 'none' })
  setTimeout(() => {
    Taro.switchTab({ url: PROFILE_TAB_URL }).catch((err) => {
      console.warn('switchTab profile for legal consent failed:', err)
    })
  }, 500)
}

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(name)

  if (!ROUTED_ACTIONS.has(name)) {
    console.error(`callCloud blocked unknown action: ${name}`)
    return {
      ok: false,
      code: 'UNKNOWN_ACTION_CLIENT_BLOCKED',
      requestId: clientRequestId,
      message: '服务入口未注册，请更新小程序后重试',
    } as CloudResponse<T>
  }

  const payload = { action: name, ...data, clientRequestId }

  try {
    const result = await Taro.cloud.callFunction({ name: APP_SERVICE_NAME, data: payload })
    const res = (result.result || {}) as CloudResponse<T>
    if (res.code === LEGAL_CONSENT_REQUIRED_CODE) handleLegalConsentRequired()
    return res
  } catch (err: any) {
    console.error(`callCloud ${name} error:`, err)
    return {
      ok: false,
      code: 'CLOUD_CALL_FAILED',
      requestId: clientRequestId,
      message: err?.message || '服务暂时不可用，请稍后再试',
    } as CloudResponse<T>
  }
}
