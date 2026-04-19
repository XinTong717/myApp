const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { targetUserId } = event

  if (!targetUserId) {
    return { ok: false, message: '缺少目标用户' }
  }

  // 查自己的资料
  const myRes = await db.collection('users')
    .where({ openid: myOpenid })
    .limit(1)
    .get()

  if (myRes.data.length === 0) {
    return { ok: false, message: '请先填写你的资料' }
  }
  const me = myRes.data[0]

  // 查目标用户
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

  // 不能给自己发请求
  if (target.openid === myOpenid) {
    return { ok: false, message: '不能给自己发联络请求哦' }
  }

  if (target.allowIncomingRequests === false) {
    return { ok: false, message: '对方当前暂停接收联络' }
  }

  // 拉黑检查：我拉黑了TA / TA拉黑了我
  const mySafetyRes = await db.collection('safety_relations')
    .where({ ownerOpenid: myOpenid, targetOpenid: target.openid, isBlocked: true })
    .limit(1)
    .get()
  if (mySafetyRes.data.length > 0) {
    return { ok: false, message: '你已拉黑该用户，需先解除拉黑' }
  }

  const targetSafetyRes = await db.collection('safety_relations')
    .where({ ownerOpenid: target.openid, targetOpenid: myOpenid, isBlocked: true })
    .limit(1)
    .get()
  if (targetSafetyRes.data.length > 0) {
    return { ok: false, message: '当前无法向该用户发起联络' }
  }

  // 检查是否已经有 pending 或 accepted 的请求（双向检查）
  const existCheck1 = await db.collection('connections')
    .where({ fromOpenid: myOpenid, toOpenid: target.openid, status: 'pending' })
    .limit(1)
    .get()
  if (existCheck1.data.length > 0) {
    return { ok: false, message: '你已经发送过请求了，等待对方回应' }
  }

  const existCheck2 = await db.collection('connections')
    .where({ fromOpenid: myOpenid, toOpenid: target.openid, status: 'accepted' })
    .limit(1)
    .get()
  const existCheck3 = await db.collection('connections')
    .where({ fromOpenid: target.openid, toOpenid: myOpenid, status: 'accepted' })
    .limit(1)
    .get()
  if (existCheck2.data.length > 0 || existCheck3.data.length > 0) {
    return { ok: false, message: '你们已经是联络人了' }
  }

  // 创建请求
  await db.collection('connections').add({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return { ok: true, message: '联络请求已发送' }
}
