const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles } = require('../lib/normalize')
const { hasCurrentConsent } = require('../lib/legalConsent')
const { getUserProfileByOpenid } = require('../lib/userRepo')

function hasCompletedProfile(profile) {
  return !!(profile && profile.displayName && profile.province && profile.city && normalizeRoles(profile.roles || []).length > 0)
}

function normalizeString(value) {
  return String(value || '').trim()
}

function buildPublicSignupInfo(source = {}) {
  return {
    officialUrl: normalizeString(source.officialUrl || source.official_url),
    signupNote: normalizeString(source.signupNote || source.signup_note),
  }
}

function getOrganizerContact(source = {}) {
  return normalizeString(source.organizerContact || source.organizer_contact || source.contactInfo || source.contact_info)
}

async function getMergedSubmission(eventId) {
  const matched = await db.collection('event_submissions')
    .where({ publishedEventId: eventId, status: 'merged' })
    .limit(1)
    .get()
  return matched.data[0] || null
}

async function getEventRecord(eventId) {
  const matched = await db.collection('events')
    .where({ id: eventId })
    .field({ officialUrl: true, official_url: true, signupNote: true, signup_note: true, organizerContact: true, organizer_contact: true, contactInfo: true, contact_info: true })
    .limit(1)
    .get()
  return matched.data[0] || null
}

async function getEventContactInfo(event, wxContext) {
  const requestId = resolveRequestId('get-event-contact', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')

  try {
    const [submission, eventRecord] = await Promise.all([
      getMergedSubmission(eventId),
      getEventRecord(eventId),
    ])
    const source = submission || eventRecord
    if (!source) return ok(requestId, { contactInfo: '', message: '该活动暂无额外联系方式' })

    const publicSignupInfo = {
      ...buildPublicSignupInfo(eventRecord || {}),
      ...buildPublicSignupInfo(submission || {}),
    }
    const organizerContact = getOrganizerContact(submission || {}) || getOrganizerContact(eventRecord || {})

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
        message: '完成个人资料后，才可查看组织者联系方式。',
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
