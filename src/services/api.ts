import Taro from '@tarojs/taro'

type CacheEntry<T> = {
  expiresAt: number
  data: T
}

const LIST_TTL_MS = 5 * 60 * 1000
const DETAIL_TTL_MS = 2 * 60 * 1000
const memoryCache = new Map<string, CacheEntry<any>>()

function readStorageCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = Taro.getStorageSync(key)
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as CacheEntry<T>
    if (!entry.expiresAt || entry.expiresAt <= Date.now()) {
      Taro.removeStorageSync(key)
      return null
    }
    return entry
  } catch (err) {
    console.error('readStorageCache error:', err)
    return null
  }
}

function writeStorageCache<T>(key: string, entry: CacheEntry<T>) {
  try {
    Taro.setStorageSync(key, entry)
  } catch (err) {
    console.error('writeStorageCache error:', err)
  }
}

async function getCachedData<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const memoryEntry = memoryCache.get(key)
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data as T
  }

  const storageEntry = readStorageCache<T>(key)
  if (storageEntry) {
    memoryCache.set(key, storageEntry)
    return storageEntry.data
  }

  const data = await loader()
  const nextEntry = {
    expiresAt: Date.now() + ttlMs,
    data,
  }
  memoryCache.set(key, nextEntry)
  writeStorageCache(key, nextEntry)
  return data
}

async function callPublicFunction<T>(name: string, data: Record<string, any> = {}): Promise<T> {
  const res: any = await Taro.cloud.callFunction({ name, data })
  const result = res?.result
  if (!result?.ok) {
    throw new Error(result?.message || `${name} 调用失败`)
  }
  return result as T
}

export async function fetchSchools() {
  const result = await getCachedData('public-schools:list', LIST_TTL_MS, async () => {
    const res = await callPublicFunction<{ schools?: any[] }>('getPublicSchools')
    return Array.isArray(res.schools) ? res.schools : []
  })
  return result
}

export async function fetchEvents() {
  const result = await getCachedData('public-events:list', LIST_TTL_MS, async () => {
    const res = await callPublicFunction<{ events?: any[] }>('getPublicEvents')
    return Array.isArray(res.events) ? res.events : []
  })
  return result
}

export async function fetchSchoolById(id: number) {
  if (!Number.isFinite(id) || id <= 0) return null

  const result = await getCachedData(`public-schools:detail:${id}`, DETAIL_TTL_MS, async () => {
    const res = await callPublicFunction<{ school?: any | null }>('getPublicSchoolDetail', { id })
    return res.school || null
  })
  return result
}

export async function fetchEventById(id: number) {
  if (!Number.isFinite(id) || id <= 0) return null

  const result = await getCachedData(`public-events:detail:${id}`, DETAIL_TTL_MS, async () => {
    const res = await callPublicFunction<{ event?: any | null }>('getPublicEventDetail', { id })
    return res.event || null
  })
  return result
}
