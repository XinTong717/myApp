const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function createRequestId() {
  return `get-safety-overview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

exports.main = async () => {
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('safety_relations')
      .where({ ownerOpenid: OPENID })
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get()

    const items = (res.data || []).map((item) => ({
      _id: item._id,
      targetUserId: item.targetUserId || '',
      targetName: item.targetName || '',
      targetCity: item.targetCity || '',
      isBlocked: !!item.isBlocked,
      isMuted: !!item.isMuted,
      updatedAt: item.updatedAt || null,
    }))

    return {
      ok: true,
      code: 'OK',
      requestId,
      blocked: items.filter((item) => item.isBlocked),
      muted: items.filter((item) => item.isMuted),
    }
  } catch (err) {
    console.error('getSafetyOverview error:', err)
    return {
      ok: false,
      code: 'GET_SAFETY_OVERVIEW_FAILED',
      requestId,
      blocked: [],
      muted: [],
      message: '读取安全设置失败',
    }
  }
}
