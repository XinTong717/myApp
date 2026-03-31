const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  const { schoolId, schoolName, content } = event

  if (!content || !content.trim()) {
    return { ok: false, message: '内容不能为空' }
  }

  if (!schoolId) {
    return { ok: false, message: '缺少学校信息' }
  }

  try {
    await db.collection('corrections').add({
      data: {
        openid: OPENID,
        schoolId: schoolId,
        schoolName: schoolName || '',
        content: content.trim(),
        status: 'pending',  // pending / reviewed / applied / rejected
        createdAt: db.serverDate(),
      },
    })

    return { ok: true, message: '提交成功' }
  } catch (err) {
    console.error('submitCorrection error:', err)
    return { ok: false, message: '提交失败，请稍后重试' }
  }
}
