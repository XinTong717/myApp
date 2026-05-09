const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { runMsgSecCheck } = require('../lib/security')

function buildContentSecurityFields(sec = {}) {
  return {
    contentSecurityStatus: sec.contentSecurityStatus || 'unknown',
    contentSecuritySuggest: sec.contentSecuritySuggest || '',
    contentSecurityLabel: sec.contentSecurityLabel || '',
    contentSecurityErrorCode: sec.contentSecurityErrorCode || 0,
    contentSecurityError: sec.contentSecurityError || '',
  }
}

async function submitEventCorrection(event, wxContext) {
  const requestId = resolveRequestId('submit-event-correction', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  const eventTitle = String(event.eventTitle || '').trim()
  const content = String(event.content || '').trim()

  if (!content) return fail(requestId, 'CONTENT_REQUIRED', '内容不能为空')
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动信息')

  const sec = await runMsgSecCheck({
    content,
    openid,
    scene: 2,
    blockedMessage: '内容包含不合规信息，请修改后重试',
    failedMessage: '内容审核失败，请稍后重试',
  })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)

  try {
    await db.collection('event_corrections').add({
      data: {
        openid,
        eventId,
        eventTitle,
        content,
        ...buildContentSecurityFields(sec),
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return ok(requestId, { message: '提交成功' })
  } catch (err) {
    console.error('appService submitEventCorrection error:', err)
    return fail(requestId, 'SUBMIT_EVENT_CORRECTION_FAILED', '提交失败，请稍后重试')
  }
}

module.exports = {
  submitEventCorrection,
}
