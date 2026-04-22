import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(name)

  try {
    const res = await Taro.cloud.callFunction({ name, data: { ...data, clientRequestId } })
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
