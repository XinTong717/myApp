const { cloud } = require('./cloud')

const HARD_BLOCK_ERR_CODES = new Set([87014])
const SOFT_PASS_SCENES = new Set([2])

function readErrCode(value) {
  const n = Number(value?.errCode ?? value?.errcode ?? value?.code ?? 0)
  return Number.isFinite(n) ? n : 0
}

function readSuggest(res) {
  return String(res?.result?.suggest || res?.suggest || '').trim().toLowerCase()
}

function readLabel(res) {
  return String(res?.result?.label || res?.label || '').trim()
}

function isHardBlockError(err) {
  const errCode = readErrCode(err)
  const errMsg = String(err?.errMsg || err?.message || '')
  return HARD_BLOCK_ERR_CODES.has(errCode) || /risky|违规|违法|不合规|敏感/i.test(errMsg)
}

async function runMsgSecCheck({
  content,
  openid,
  scene = 2,
  maxLen = 2500,
  blockedMessage = '内容包含不合规信息，请修改后重试',
  failedMessage = '内容审核失败，请稍后重试',
  softPassOnFailure,
}) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return { ok: true, contentSecurityStatus: 'skipped_empty' }
  }

  const shouldSoftPassOnFailure = softPassOnFailure !== undefined ? !!softPassOnFailure : SOFT_PASS_SCENES.has(scene)

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, maxLen),
      version: 2,
      scene,
      openid,
    })

    const errCode = readErrCode(res)
    const suggest = readSuggest(res)
    const label = readLabel(res)

    if (errCode === 0 && (!suggest || suggest === 'pass')) {
      return {
        ok: true,
        contentSecurityStatus: 'passed',
        contentSecuritySuggest: suggest || 'pass',
        contentSecurityLabel: label,
      }
    }

    if (suggest === 'review') {
      return {
        ok: false,
        code: 'CONTENT_SECURITY_REVIEW',
        message: blockedMessage,
        contentSecurityStatus: 'review',
        contentSecuritySuggest: suggest,
        contentSecurityLabel: label,
      }
    }

    return {
      ok: false,
      code: 'CONTENT_SECURITY_BLOCKED',
      message: blockedMessage,
      contentSecurityStatus: 'blocked',
      contentSecuritySuggest: suggest || 'blocked',
      contentSecurityLabel: label,
    }
  } catch (err) {
    const errCode = readErrCode(err)
    const errMsg = String(err?.errMsg || err?.message || 'unknown')
    console.error('runMsgSecCheck error:', {
      errCode,
      errMsg,
      scene,
      contentLength: normalized.length,
    })

    if (isHardBlockError(err)) {
      return { ok: false, code: 'CONTENT_SECURITY_BLOCKED', message: blockedMessage, contentSecurityStatus: 'blocked' }
    }

    if (shouldSoftPassOnFailure) {
      console.warn('runMsgSecCheck soft-passed after API failure; content remains pending for human review')
      return {
        ok: true,
        code: 'CONTENT_SECURITY_FAILED_SOFT',
        contentSecurityStatus: 'check_failed',
        contentSecurityErrorCode: errCode,
        contentSecurityError: errMsg,
      }
    }

    return {
      ok: false,
      code: 'CONTENT_SECURITY_FAILED',
      message: failedMessage,
      contentSecurityStatus: 'check_failed',
      contentSecurityErrorCode: errCode,
      contentSecurityError: errMsg,
    }
  }
}

module.exports = {
  runMsgSecCheck,
}
