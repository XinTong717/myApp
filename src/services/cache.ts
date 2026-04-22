import Taro from '@tarojs/taro'

type CacheEnvelope<T> = {
  value: T
  expiresAt: number
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>()

function isExpired(expiresAt: number) {
  return Date.now() > expiresAt
}

export function getCachedValue<T>(key: string): T | null {
  const memoryHit = memoryCache.get(key) as CacheEnvelope<T> | undefined
  if (memoryHit) {
    if (!isExpired(memoryHit.expiresAt)) {
      return memoryHit.value
    }
    memoryCache.delete(key)
  }

  try {
    const stored = Taro.getStorageSync(key) as CacheEnvelope<T> | undefined
    if (!stored || typeof stored.expiresAt !== 'number') return null
    if (isExpired(stored.expiresAt)) {
      Taro.removeStorageSync(key)
      return null
    }
    memoryCache.set(key, stored)
    return stored.value
  } catch (err) {
    return null
  }
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  const payload: CacheEnvelope<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  }

  memoryCache.set(key, payload)

  try {
    Taro.setStorageSync(key, payload)
  } catch (err) {
    console.warn(`[cache] failed to persist ${key}`, err)
  }
}

export function clearCachedValue(key: string) {
  memoryCache.delete(key)
  try {
    Taro.removeStorageSync(key)
  } catch (err) {
    console.warn(`[cache] failed to clear ${key}`, err)
  }
}
