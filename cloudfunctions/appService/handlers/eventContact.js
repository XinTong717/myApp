const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles } = require('../lib/normalize')
const { hasCurrentConsent } = require('../lib/legalConsent')
const { getUserProfileByOpenid } = require('../lib/userRepo')

function hasCompletedProfile(profile) {
  return !!(profile && profile.displayName && profile.province && profile.city && normalizeRoles(profile.roles || []).length > 0)
}

async function getEventContactInfo(event, wxContext) {
  const requestId = resolveRequestId('get-event-contact', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')

  try {
    const matched = await db.collection('event_submissions')
      .where({ publishedEventId: eventId, status: 'merged' })
      .limit(1)
      .get()
    const submission = matched.data[0] || null
    if (!submission) return ok(requestId, { contactInfo: '', message: '该活动暂无额外联系方式' })

    const publicSignupInfo = {
      officialUrl: String(submission.officialUrl || '').trim(),
      signupNote: String(submission.signupNote || '').trim(),
    }
    const organizerContact = String(submission.organizerContact || '').trim()

    if (!organizerContact) {
      return ok(requestId, {
        contactInfo: '',
        publicSignupInfo,
        message: '该活动暂无额外联系方式',
      })
    }

    const [profile, consentOk] = await Promise.all([
      getUserProfileByOpenid(openid),
      hasCurrentConsent(openid),
    ])
    if (!hasCompletedProfile(profile) || !consentOk) {
      return ok(requestId, {
        contactInfo: '',
        publicSignupInfo,
        needCompleteProfile: true,
        privateContactRequiresProfile: true,
        message: '完成个人资料后，才可查看组织者私人联系方式。',
      })
    }

    return ok(requestId, {
      contactInfo: organizerContact,
      publicSignupInfo,
    })
  } catch (err) {
    console.error('appService getEventContactInfo gated error:', err)
    return fail(requestId, 'GET_EVENT_CONTACT_INFO_FAILED', '读取联系方式失败，请稍后重试')
  }
}

module.exports = {
  getEventContactInfo,
}
