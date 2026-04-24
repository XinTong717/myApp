import Taro from '@tarojs/taro'

type CacheEnvelope<T> = {
  value: T
  expiresAt: number
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>()
const CACHE_SCOPE_STORAGE_KEY = 'cloud-cache:scope:v1'
let cacheScope: string | null = null
let cacheScopePromise: Promise<string> | null = null

function isExpired(expiresAt: number) {
  return Date.now() > expiresAt
}

function normalizeScope(value: unknown) {
  const text = String(value || '').trim()
  return text || 'anonymous'
}

function getScopedKey(scope: string, key: string) {
  return `${scope}:${key}`
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

export async function getCacheScopePrefix() {
  if (cacheScope) return cacheScope

  try {
    const storedScope = Taro.getStorageSync(CACHE_SCOPE_STORAGE_KEY)
    if (storedScope) {
      cacheScope = normalizeScope(storedScope)
      return cacheScope
    }
  } catch (err) {
    console.warn('[cache] failed to read cache scope', err)
  }

  if (!cacheScopePromise) {
    cacheScopePromise = (async () => {
      try {
        const res = await Taro.cloud.callFunction({
          name: 'getOpenId',
          data: {
            clientRequestId: `cache-scope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        })
        const result = (res?.result || {}) as { ok?: boolean; openid?: string }
        const nextScope = normalizeScope(result?.ok ? result?.openid : '')
        cacheScope = nextScope
        Taro.setStorageSync(CACHE_SCOPE_STORAGE_KEY, nextScope)
        return nextScope
      } catch (err) {
        console.warn('[cache] failed to resolve openid cache scope, fallback to anonymous', err)
        cacheScope = 'anonymous'
        return cacheScope
      } finally {
        cacheScopePromise = null
      }
    })()
  }

  return cacheScopePromise
}

export async function getScopedCachedValue<T>(key: string): Promise<T | null> {
  const scope = await getCacheScopePrefix()
  return getCachedValue<T>(getScopedKey(scope, key))
}

export async function setScopedCachedValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const scope = await getCacheScopePrefix()
  setCachedValue(getScopedKey(scope, key), value, ttlMs)
}

export async function clearScopedCachedValue(key: string): Promise<void> {
  const scope = await getCacheScopePrefix()
  clearCachedValue(getScopedKey(scope, key))
}
