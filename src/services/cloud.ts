import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'

const APP_SERVICE_NAME = 'appService'

const ROUTED_ACTIONS = new Set([
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
  'listEventSubmissions',
  'getEventPublishPayload',
  'reviewEventSubmission',
])

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(name)
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
      message: err?.errMsg || err?.message || '云函数调用失败',
    } as CloudResponse<T>
  }
}
