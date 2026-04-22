const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DAILY_LIMIT = 20
const SAME_TARGET_DAILY_LIMIT = 3

function createRequestId() {
  return `send-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
}

function buildConnectionDocId(fromOpenid, toOpenid) {
  return `conn_${fromOpenid}_${toOpenid}`
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const targetUserId = String(event.targetUserId || '').trim()

  if (!targetUserId) {
    return { ok: false, code: 'TARGET_REQUIRED', requestId, message: '缺少目标用户' }
  }

  const myRes = await db.collection('users')
    .where({ openid: myOpenid })
    .limit(1)
    .get()

  if (myRes.data.length === 0) {
    return { ok: false, code: 'PROFILE_REQUIRED', requestId, message: '请先填写你的资料' }
  }
  const me = myRes.data[0]

  let target
  try {
    const targetRes = await db.collection('users').doc(targetUserId).get()
    target = targetRes.data
  } catch (err) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (!target || !target.openid) {
    return { ok: false, code: 'TARGET_NOT_FOUND', requestId, message: '找不到该用户' }
  }

  if (target.openid === myOpenid) {
    return { ok: false, code: 'SELF_REQUEST_NOT_ALLOWED', requestId, message: '不能给自己发联络请求哦' }
  }

  if (target.allowIncomingRequests === false) {
    return { ok: false, code: 'TARGET_PAUSED_REQUESTS', requestId, message: '对方当前暂停接收联络' }
  }

  const mySafetyRes = await db.collection('safety_relations')
    .where({ ownerOpenid: myOpenid, targetOpenid: target.openid, isBlocked: true })
    .limit(1)
    .get()
  if (mySafetyRes.data.length > 0) {
    return { ok: false, code: 'YOU_BLOCKED_TARGET', requestId, message: '你已拉黑该用户，需先解除拉黑' }
  }

  const targetSafetyRes = await db.collection('safety_relations')
    .where({ ownerOpenid: target.openid, targetOpenid: myOpenid, isBlocked: true })
    .limit(1)
    .get()
  if (targetSafetyRes.data.length > 0) {
    return { ok: false, code: 'TARGET_BLOCKED_YOU', requestId, message: '当前无法向该用户发起联络' }
  }

  const connectionId = buildConnectionDocId(myOpenid, target.openid)
  const reverseConnectionId = buildConnectionDocId(target.openid, myOpenid)

  let sameDirectionRecord = null
  try {
    const sameDirectionRes = await db.collection('connections').doc(connectionId).get()
    sameDirectionRecord = sameDirectionRes.data || null
  } catch (err) {
    sameDirectionRecord = null
  }

  if (sameDirectionRecord?.status === 'pending') {
    return { ok: false, code: 'REQUEST_ALREADY_PENDING', requestId, message: '你已经发送过请求了，等待对方回应' }
  }

  if (sameDirectionRecord?.status === 'accepted') {
    return { ok: false, code: 'ALREADY_CONNECTED', requestId, message: '你们已经是联络人了' }
  }

  let reverseRecord = null
  try {
    const reverseRes = await db.collection('connections').doc(reverseConnectionId).get()
    reverseRecord = reverseRes.data || null
  } catch (err) {
    reverseRecord = null
  }

  if (reverseRecord?.status === 'accepted') {
    return { ok: false, code: 'ALREADY_CONNECTED', requestId, message: '你们已经是联络人了' }
  }

  if (reverseRecord?.status === 'pending') {
    return { ok: false, code: 'REVERSE_PENDING_EXISTS', requestId, message: '对方已经向你发起请求，请先处理对方的联络请求' }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [dailyCountRes, sameTargetCountRes] = await Promise.all([
    db.collection('connections')
      .where({
        fromOpenid: myOpenid,
        createdAt: _.gte(since),
      })
      .count(),
    db.collection('connections')
      .where({
        fromOpenid: myOpenid,
        toOpenid: target.openid,
        createdAt: _.gte(since),
      })
      .count(),
  ])

  if ((dailyCountRes?.total || 0) >= DAILY_LIMIT) {
    return { ok: false, code: 'DAILY_LIMIT_REACHED', requestId, message: '24小时内发起联络次数过多，请稍后再试' }
  }

  if ((sameTargetCountRes?.total || 0) >= SAME_TARGET_DAILY_LIMIT) {
    return { ok: false, code: 'SAME_TARGET_LIMIT_REACHED', requestId, message: '24小时内你已多次尝试联系该用户，请稍后再试' }
  }

  await db.collection('connections').doc(connectionId).set({
    data: {
      fromOpenid: myOpenid,
      fromUserId: me._id,
      fromName: me.displayName || '',
      fromCity: me.city || '',
      fromRoles: me.roles || [],
      fromBio: me.bio || '',
      toOpenid: target.openid,
      toUserId: target._id,
      toName: target.displayName || '',
      toCity: target.city || '',
      toRoles: target.roles || [],
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return { ok: true, code: 'OK', requestId, connectionId, message: '联络请求已发送' }
}
