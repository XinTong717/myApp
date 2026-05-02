import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'
import { hasCurrentLocalLegalConsent } from './legalConsent'

const APP_SERVICE_NAME = 'appService'

const ROUTED_ACTIONS = new Set([
  'getOpenId',
  'getSchools',
  'getSchoolDetail',
  'getEvents',
  'getEventDetail',
  'submitCorrection',
  'submitCommunity',
  'submitEvent',
  'getEventInterestCountsBatch',
  'getEventInterestInfo',
  'toggleEventInterest',
  'getEventContactInfo',
  'getMe',
  'saveProfile',
  'updatePrivacySettings',
  'getSafetyOverview',
  'getMapUsers',
  'sendRequest',
  'getMyRequests',
  'respondRequest',
  'manageConnection',
  'manageSafetyRelation',
  'reportUser',
  'checkAdminAccess',
  'recordLegalConsent',
  'getLegalConsentStatus',
  'listEventSubmissions',
  'getEventPublishPayload',
  'publishEventDirect',
  'reviewEventSubmission',
  'migrateSchoolLocations',
  'validateSchoolLocationsMigration',
])

const LEGAL_CONSENT_EXEMPT_ACTIONS = new Set([
  'recordLegalConsent',
  'getLegalConsentStatus',
])

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getCurrentPageUrl() {
  const pagesGetter = (globalThis as any).getCurrentPages
  const pages = typeof pagesGetter === 'function' ? pagesGetter() : []
  const current = pages[pages.length - 1]
  const route = String(current?.route || '')
  const options = current?.options || {}
  const query = Object.keys(options)
    .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`)
    .join('&')
  return route ? `/${route}${query ? `?${query}` : ''}` : '/pages/explore/index'
}

let consentRedirecting = false

function ensureLegalConsentPage() {
  const currentUrl = getCurrentPageUrl()
  if (currentUrl.startsWith('/pages/legal-consent/index')) return
  if (consentRedirecting) return
  consentRedirecting = true
  Taro.navigateTo({
    url: `/pages/legal-consent/index?target=${encodeURIComponent(currentUrl)}`,
  }).finally(() => {
    setTimeout(() => { consentRedirecting = false }, 800)
  })
}

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(name)

  if (!LEGAL_CONSENT_EXEMPT_ACTIONS.has(name) && !hasCurrentLocalLegalConsent()) {
    ensureLegalConsentPage()
    return {
      ok: false,
      code: 'LEGAL_CONSENT_REQUIRED',
      requestId: clientRequestId,
      message: '请先阅读并同意用户协议和隐私政策',
    } as CloudResponse<T>
  }

  const routed = ROUTED_ACTIONS.has(name)
  const functionName = routed ? APP_SERVICE_NAME : name
  const payload = routed
    ? { action: name, ...data, clientRequestId }
    : { ...data, clientRequestId }

  try {
    const res = await Taro.cloud.callFunction({ name: functionName, data: payload })
    const result = ((res.result || {}) as CloudResponse<T>) || ({ ok: false } as CloudResponse<T>)

    if (!result.requestId) {
      result.requestId = clientRequestId
    }

    if (typeof result.ok !== 'boolean') {
      console.warn(`callCloud ${name} missing explicit ok flag`, result)
      result.ok = false
      result.code = result.code || 'INVALID_CLOUD_RESPONSE'
      result.message = result.message || '服务返回格式异常，请稍后重试'
    }

    return result
  } catch (err: any) {
    console.error(`callCloud ${name} error:`, err)
    return {
      ok: false,
      code: 'CLOUD_CALL_FAILED',
      requestId: clientRequestId,
      message: '网络异常，请稍后重试',
    } as CloudResponse<T>
  }
}
