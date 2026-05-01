const pendingActionKeys = new Set<string>()

export async function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingActionKeys.has(key)) {
    return {
      ok: false,
      code: 'DUPLICATE_CLIENT_ACTION',
      message: '操作正在处理中，请勿重复点击',
    } as T
  }

  pendingActionKeys.add(key)
  try {
    return await fn()
  } finally {
    pendingActionKeys.delete(key)
  }
}
