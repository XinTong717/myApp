const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function runMsgSecCheck(content, openid) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return { ok: true }
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, 2500),
      version: 2,
      scene: 2,
      openid,
    })

    const errCode = res?.errCode ?? res?.errcode ?? 0
    if (errCode === 0) {
      return { ok: true }
    }

    console.error('submitCorrection msgSecCheck blocked content:', res)
    return { ok: false, message: '内容包含不合规信息，请修改后重试' }
  } catch (err) {
    console.error('submitCorrection msgSecCheck error:', err)
    return { ok: false, message: '内容审核失败，请稍后重试' }
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  const { schoolId, schoolName, content } = event

  if (!content || !content.trim()) {
    return { ok: false, message: '内容不能为空' }
  }

  if (!schoolId) {
    return { ok: false, message: '缺少学习社区信息' }
  }

  const securityResult = await runMsgSecCheck(content, OPENID)
  if (!securityResult.ok) {
    return securityResult
  }

  try {
    await db.collection('corrections').add({
      data: {
        openid: OPENID,
        schoolId: schoolId,
        schoolName: schoolName || '',
        content: content.trim(),
        status: 'pending',
        createdAt: db.serverDate(),
      },
    })

    return { ok: true, message: '提交成功' }
  } catch (err) {
    console.error('submitCorrection error:', err)
    return { ok: false, message: '提交失败，请稍后重试' }
  }
}
