const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getUserProfileByOpenid } = require('../lib/userRepo')

function buildInterestDocId(eventId, openid) {
  return `event_${eventId}_${openid}`
}

async function hasUserInterested(eventId, openid) {
  const stableDocId = buildInterestDocId(eventId, openid)

  try {
    const stableRes = await db.collection('event_interest').doc(stableDocId).get()
    return stableRes.data?.status === 'interested'
  } catch (err) {
    const interestRes = await db.collection('event_interest')
      .where({ eventId, openid, status: _.in(['interested']) })
      .limit(1)
      .get()
    return interestRes.data.length > 0
  }
}

async function getEventContactInfo(event, wxContext) {
  const requestId = resolveRequestId('get-event-contact', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')

  try {
    const matched = await db.collection('event_submissions')
      .where({ publishedEventId: eventId, status: _.in(['merged', 'approved']) })
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

    const profile = await getUserProfileByOpenid(openid)
    if (!(profile && profile.displayName && profile.province && profile.city)) {
      return ok(requestId, {
        contactInfo: '',
        publicSignupInfo,
        needCompleteProfile: true,
        privateContactRequiresProfile: true,
        message: '完成“我的资料”填写后，才可查看组织者私人联系方式。',
      })
    }

    const interested = await hasUserInterested(eventId, openid)
    if (!interested) {
      return ok(requestId, {
        contactInfo: '',
        publicSignupInfo,
        privateContactRequiresInterest: true,
        message: '标记“我感兴趣”后，才可查看组织者私人联系方式。公开报名信息仍可查看。',
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
