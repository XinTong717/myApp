import Taro from '@tarojs/taro'

type PreviewEnvelope<T> = {
  value: T
  expiresAt: number
}

const DETAIL_PREVIEW_TTL_MS = 5 * 60 * 1000
const memoryPreviewCache = new Map<string, PreviewEnvelope<unknown>>()

function previewKey(kind: 'event' | 'school', id: string | number) {
  return `detail-preview:${kind}:${id}`
}

function isFresh<T>(payload: PreviewEnvelope<T> | null | undefined): payload is PreviewEnvelope<T> {
  return !!payload && typeof payload.expiresAt === 'number' && Date.now() <= payload.expiresAt
}

export function setDetailPreview<T>(kind: 'event' | 'school', id: string | number, value: T) {
  if (!id) return
  const key = previewKey(kind, id)
  const payload: PreviewEnvelope<T> = {
    value,
    expiresAt: Date.now() + DETAIL_PREVIEW_TTL_MS,
  }

  memoryPreviewCache.set(key, payload)

  try {
    Taro.setStorageSync(key, payload)
  } catch (err) {
    console.warn('[detailPreview] failed to persist preview', err)
  }
}

export function getDetailPreview<T>(kind: 'event' | 'school', id: string | number): T | null {
  if (!id) return null
  const key = previewKey(kind, id)
  const memoryHit = memoryPreviewCache.get(key) as PreviewEnvelope<T> | undefined

  if (isFresh(memoryHit)) return memoryHit.value
  if (memoryHit) memoryPreviewCache.delete(key)

  try {
    const stored = Taro.getStorageSync(key) as PreviewEnvelope<T> | undefined
    if (isFresh(stored)) {
      memoryPreviewCache.set(key, stored)
      return stored.value
    }
    if (stored) Taro.removeStorageSync(key)
  } catch (err) {
    return null
  }

  return null
}
