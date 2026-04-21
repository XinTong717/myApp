import Taro from '@tarojs/taro'
import type { CloudResponse } from '../types/domain'

export async function callCloud<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) {
  try {
    const res = await Taro.cloud.callFunction({ name, data })
    return (res.result || {}) as CloudResponse<T>
  } catch (err: any) {
    console.error(`callCloud ${name} error:`, err)
    return {
      ok: false,
      message: err?.errMsg || err?.message || '云函数调用失败',
    } as CloudResponse<T>
  }
}
