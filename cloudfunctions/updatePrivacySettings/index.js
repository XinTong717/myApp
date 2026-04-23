const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function createRequestId() {
  return `update-privacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
}

async function resolveUserDocId(openid) {
  try {
    const docRes = await db.collection('users').doc(openid).get()
    if (docRes.data) {
      return openid
    }
  } catch (err) {
    console.warn('updatePrivacySettings canonical doc lookup missed, fallback to legacy query')
  }

  const legacyRes = await db.collection('users')
    .where({ openid })
    .limit(1)
    .get()

  return legacyRes.data[0]?._id || ''
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)
  const { OPENID } = cloud.getWXContext()
  const updates = {}

  if (event.allowIncomingRequests !== undefined) {
    updates.allowIncomingRequests = !!event.allowIncomingRequests
  }
  if (event.isVisibleOnMap !== undefined) {
    updates.isVisibleOnMap = !!event.isVisibleOnMap
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      code: 'BAD_REQUEST',
      requestId,
      message: '没有可更新的隐私设置',
    }
  }

  try {
    const userDocId = await resolveUserDocId(OPENID)

    if (!userDocId) {
      return {
        ok: false,
        code: 'PROFILE_NOT_FOUND',
        requestId,
        message: '请先完成个人资料填写',
      }
    }

    await db.collection('users').doc(userDocId).update({
      data: {
        ...updates,
        updatedAt: db.serverDate(),
      },
    })

    return {
      ok: true,
      code: 'OK',
      requestId,
      message: '隐私设置已更新',
      ...updates,
    }
  } catch (err) {
    console.error('updatePrivacySettings error:', err)
    return {
      ok: false,
      code: 'UPDATE_PRIVACY_SETTINGS_FAILED',
      requestId,
      message: '更新隐私设置失败，请稍后重试',
    }
  }
}
