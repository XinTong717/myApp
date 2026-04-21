import Taro from '@tarojs/taro'

export async function callCloud<T = any>(name: string, data: Record<string, any> = {}) {
  const res = await Taro.cloud.callFunction({ name, data })
  return (res.result || {}) as T
}
