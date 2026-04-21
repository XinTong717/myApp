const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const updates = {}

  if (event.allowIncomingRequests !== undefined) {
    updates.allowIncomingRequests = !!event.allowIncomingRequests
  }
  if (event.isVisibleOnMap !== undefined) {
    updates.isVisibleOnMap = !!event.isVisibleOnMap
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, message: '没有可更新的隐私设置' }
  }

  try {
    const res = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get()

    if (res.data.length === 0) {
      return { ok: false, message: '请先完成个人资料填写' }
    }

    await db.collection('users').doc(res.data[0]._id).update({
      data: {
        ...updates,
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, message: '隐私设置已更新', ...updates }
  } catch (err) {
    console.error('updatePrivacySettings error:', err)
    return { ok: false, message: '更新隐私设置失败，请稍后重试' }
  }
}
