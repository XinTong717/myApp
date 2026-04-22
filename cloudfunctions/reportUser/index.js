const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const REASON_WHITELIST = ['垃圾广告', '骚扰不适', '未成年人敏感信息', '其他']

function createRequestId() {
  return `report-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function runMsgSecCheck(content, openid) {
  const normalized = String(content || '').trim()
  if (!normalized) return { ok: true }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, 1000),
      version: 2,
      scene: 2,
      openid,
    })
    const errCode = res?.errCode ?? res?.errcode ?? 0
    if (errCode === 0) return { ok: true }
    return { ok: false, code: 'CONTENT_SECURITY_BLOCKED', message: '举报说明包含不合规信息，请修改后重试' }
  } catch (err) {
    console.error('reportUser msgSecCheck error:', err)
    return { ok: false, code: 'CONTENT_SECURITY_FAILED', message: '举报说明审核失败，请稍后重试' }
  }
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const targetUserId = String(event.targetUserId || '').trim()
  const reason = String(event.reason || '').trim()
  const note = String(event.note || '').trim()

  if (!targetUserId) {
    return { ok: false, code: 'TARGET_REQUIRED', requestId, message: '缺少目标用户' }
  }

  if (reason && !REASON_WHITELIST.includes(reason)) {
    return { ok: false, code: 'INVALID_REASON', requestId, message: '举报原因不合法' }
  }

  if (note.length > 1000) {
    return { ok: false, code: 'NOTE_TOO_LONG', requestId, message: '举报说明不能超过1000字' }
  }

  let target
  try {
    const targetRes = await db.collection('users').doc(targetUserId).get()
    target = targetRes.data
  } catch (err) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (!target || !target.openid) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (target.openid === OPENID) {
    return { ok: false, code: 'SELF_REPORT_NOT_ALLOWED', requestId, message: '不能举报自己' }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const duplicateRes = await db.collection('user_reports')
    .where({
      reporterOpenid: OPENID,
      targetOpenid: target.openid,
      createdAt: _.gte(since),
    })
    .limit(1)
    .get()

  if (duplicateRes.data.length > 0) {
    return { ok: false, code: 'DUPLICATE_REPORT', requestId, message: '24小时内你已经举报过该用户，无需重复提交' }
  }

  if (note) {
    const securityResult = await runMsgSecCheck(note, OPENID)
    if (!securityResult.ok) {
      return {
        ok: false,
        code: securityResult.code || 'CONTENT_SECURITY_BLOCKED',
        requestId,
        message: securityResult.message,
      }
    }
  }

  try {
    await db.collection('user_reports').add({
      data: {
        reporterOpenid: OPENID,
        targetOpenid: target.openid,
        targetUserId,
        targetName: target.displayName || '',
        reason: reason || '未分类',
        note,
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, code: 'OK', requestId, message: '举报已提交，感谢反馈' }
  } catch (err) {
    console.error('reportUser error:', err)
    return { ok: false, code: 'REPORT_USER_FAILED', requestId, message: '举报失败，请稍后重试' }
  }
}
