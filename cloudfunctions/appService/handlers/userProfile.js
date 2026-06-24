const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const userV2 = require('./userV2')

const REASON_WHITELIST = ['垃圾广告', '骚扰不适', '未成年人敏感信息', '其他']

async function reportUser(event, wxContext) {
  const requestId = resolveRequestId('report-user', event)
  const openid = wxContext.OPENID
  const targetUserId = String(event.targetUserId || '').trim()
  const reason = String(event.reason || '').trim()

  if (!targetUserId || !reason) return fail(requestId, 'BAD_REQUEST', '请选择举报原因')
  if (!REASON_WHITELIST.includes(reason)) return fail(requestId, 'INVALID_REASON', '举报原因不合法')

  let target
  try {
    target = (await db.collection('users').doc(targetUserId).get()).data
  } catch (err) {
    return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户')
  }

  if (!target || !target.openid) return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户')

  try {
    await db.collection('user_reports').add({
      data: {
        reporterOpenid: openid,
        targetUserId,
        targetOpenid: target.openid,
        targetName: target.displayName || target.name || '未知用户',
        targetCity: target.city || '',
        reason,
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return ok(requestId, { message: '举报已提交' })
  } catch (err) {
    console.error('appService reportUser error:', err)
    return fail(requestId, 'REPORT_USER_FAILED', '举报失败，请稍后重试')
  }
}

module.exports = {
  getMe: userV2.getMe,
  saveProfile: userV2.saveProfile,
  updatePrivacySettings: userV2.updatePrivacySettings,
  requestAccountDeletion: userV2.requestAccountDeletion,
  getSafetyOverview: userV2.getSafetyOverview,
  manageSafetyRelation: userV2.manageSafetyRelation,
  reportUser,
}
