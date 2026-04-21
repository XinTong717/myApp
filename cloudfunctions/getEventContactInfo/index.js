const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function isProfileComplete(profile) {
  return !!(
    profile &&
    profile.displayName &&
    profile.province &&
    profile.city
  )
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const eventId = Number(event.eventId || 0)

  if (!eventId) {
    return { ok: false, message: '缺少活动 ID' }
  }

  try {
    const userRes = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get()

    const profile = userRes.data[0] || null
    if (!isProfileComplete(profile)) {
      return {
        ok: false,
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
        contactInfo: '',
        message: '该活动暂无额外联系方式',
      }
    }

    return {
      ok: true,
      contactInfo: String(submission.organizerContact || '').trim(),
      publicSignupInfo: {
        officialUrl: String(submission.officialUrl || '').trim(),
        signupNote: String(submission.signupNote || '').trim(),
      },
    }
  } catch (err) {
    console.error('getEventContactInfo error:', err)
    return { ok: false, message: '读取联系方式失败，请稍后重试' }
  }
}
