import type { CloudResponse } from '../types/domain'

export type CloudCodeMessageMap = Record<string, string>

export function resolveCloudMessage(
  result: Pick<CloudResponse, 'code' | 'message' | 'requestId'> | null | undefined,
  codeMap: CloudCodeMessageMap,
  defaultMessage: string,
) {
  if (!result) return defaultMessage
  if (result.message) return result.message
  if (result.code && codeMap[result.code]) return codeMap[result.code]
  return defaultMessage
}

export function logCloudFailure(scene: string, result: Pick<CloudResponse, 'code' | 'requestId' | 'message'> | null | undefined) {
  if (!result || !result.code) return
  console.warn(`[${scene}] failed`, {
    code: result.code,
    requestId: result.requestId,
    message: result.message,
  })
}
