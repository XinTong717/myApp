import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'

function createClientRequestId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  const clientRequestId = createClientRequestId(name)

  try {
    const res = await Taro.cloud.callFunction({ name, data })
    const result = ((res.result || {}) as CloudResponse<T>) || { ok: false }

    if (!result.requestId) {
      result.requestId = clientRequestId
    }

    if (result.ok === undefined) {
      result.ok = true
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
