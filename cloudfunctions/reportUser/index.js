const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const targetUserId = String(event.targetUserId || '').trim()
  const reason = String(event.reason || '').trim()
  const note = String(event.note || '').trim()

  if (!targetUserId) {
    return { ok: false, message: '缺少目标用户' }
  }

  let target
  try {
    const targetRes = await db.collection('users').doc(targetUserId).get()
    target = targetRes.data
  } catch (err) {
    return { ok: false, message: '找不到该用户' }
  }

  if (!target || !target.openid) {
    return { ok: false, message: '找不到该用户' }
  }

  if (target.openid === OPENID) {
    return { ok: false, message: '不能举报自己' }
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return { ok: true, message: '举报已提交，感谢反馈' }
  } catch (err) {
    console.error('reportUser error:', err)
    return { ok: false, message: '举报失败，请稍后重试' }
  }
}
