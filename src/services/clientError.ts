import { callCloud } from './cloud'
import type { SimpleActionResult } from '../types/domain'

type ClientErrorPayload = {
  scene: string
  message: string
  stack?: string
  route?: string
  reason?: string
  runtimeEnv?: string
  cloudEnv?: string
}

const MAX_TEXT_LENGTH = 2000

function truncate(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const text = String(value || '').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function normalizeClientErrorPayload(payload: ClientErrorPayload) {
  return {
    scene: truncate(payload.scene, 80) || 'unknown',
    message: truncate(payload.message),
    stack: truncate(payload.stack),
    route: truncate(payload.route, 200),
    reason: truncate(payload.reason),
    runtimeEnv: truncate(payload.runtimeEnv || __WEAPP_RUNTIME_ENV__, 40),
    cloudEnv: truncate(payload.cloudEnv || __WEAPP_CLOUD_ENV_ID__, 80),
  }
}

export async function reportClientError(payload: ClientErrorPayload) {
  return callCloud<SimpleActionResult>('reportClientError', normalizeClientErrorPayload(payload))
}
