const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function createRequestId() {
  return `get-event-contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isProfileComplete(profile) {
  return !!(
    profile &&
    profile.displayName &&
    profile.province &&
    profile.city
  )
}

async function getUserProfileByOpenid(openid) {
  try {
    const docRes = await db.collection('users').doc(openid).get()
    if (docRes.data) {
      return docRes.data
    }
  } catch (err) {
    console.warn('getEventContactInfo canonical doc lookup missed, fallback to legacy query')
  }

  const legacyRes = await db.collection('users')
    .where({ openid })
    .limit(1)
    .get()

  return legacyRes.data[0] || null
}

exports.main = async (event) => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, code: 'BAD_REQUEST', requestId, message: '缺少活动 ID' }
  }

  try {
    const profile = await getUserProfileByOpenid(OPENID)
    if (!isProfileComplete(profile)) {
      return {
        ok: false,
        code: 'PROFILE_REQUIRED',
        requestId,
        message: '完成“我的资料”填写后，才可查看组织者联系方式',
        needCompleteProfile: true,
      }
    }

    const matched = await db.collection('event_submissions')
      .where({
        publishedEventId: eventId,
        status: _.in(['merged', 'approved']),
      })
      .limit(1)
      .get()

    const submission = matched.data[0] || null
    if (!submission) {
      return {
        ok: true,
        code: 'OK',
        requestId,
        contactInfo: '',
        message: '该活动暂无额外联系方式',
      }
    }

    return {
      ok: true,
      code: 'OK',
      requestId,
      contactInfo: String(submission.organizerContact || '').trim(),
      publicSignupInfo: {
        officialUrl: String(submission.officialUrl || '').trim(),
        signupNote: String(submission.signupNote || '').trim(),
      },
    }
  } catch (err) {
    console.error('getEventContactInfo error:', err)
    return {
      ok: false,
      code: 'GET_EVENT_CONTACT_INFO_FAILED',
      requestId,
      message: '读取联系方式失败，请稍后重试',
    }
  }
}
