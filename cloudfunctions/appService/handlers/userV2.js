const { db, _, cloud } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { runMsgSecCheck } = require('../lib/security')
const {
  normalizeStringArray,
  normalizeRoles,
  normalizeProfile,
  CHILD_AGE_WHITELIST,
  CHILD_STATUS_WHITELIST,
  validateLength,
} = require('../lib/normalize')
const { getUserProfileByOpenid, resolveUserDocId } = require('../lib/userRepo')

const REASON_WHITELIST = ['垃圾广告', '骚扰不适', '未成年人敏感信息', '其他']
const DAILY_LIMIT = 20
const SAME_TARGET_DAILY_LIMIT = 3
const REJECTED_REQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function buildConnectionDocId(fromOpenid, toOpenid) {
  return `conn_${fromOpenid}_${toOpenid}`
}

function buildSafetyDocId(ownerOpenid, targetOpenid) {
  return `safety_${ownerOpenid}_${targetOpenid}`
}

function validateSearchableContactId(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length < 5 || text.length > 50) return '请输入可被搜索到的微信号、绑定手机号或QQ号'
  if (/\s/.test(text)) return '请输入可被搜索到的微信号、绑定手机号或QQ号'

  const isWechatId = /^[a-zA-Z][-_a-zA-Z0-9]{4,49}$/.test(text)
  const isMainlandPhone = /^1[3-9]\d{9}$/.test(text)
  const isQQ = /^[1-9]\d{4,11}$/.test(text)

  if (!isWechatId && !isMainlandPhone && !isQQ) {
    return '请输入可被搜索到的微信号、绑定手机号或QQ号'
  }
  return ''
}

function getCooldownRemainingDays(dateLike) {
  const ts = new Date(dateLike || '').getTime()
  if (!Number.isFinite(ts)) return 0
  const remainingMs = ts + REJECTED_REQUEST_COOLDOWN_MS - Date.now()
  if (remainingMs <= 0) return 0
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
}

async function getMe(event, wxContext) {
  const requestId = resolveRequestId('get-me', event)
  try {
    const profile = await getUserProfileByOpenid(wxContext.OPENID)
    return ok(requestId, { profile: normalizeProfile(profile) })
  } catch (err) {
    console.error('appService getMe error:', err)
    return fail(requestId, 'GET_ME_FAILED', '读取个人资料失败，请稍后重试', { profile: null })
  }
}

async function saveProfile(event, wxContext) {
  const requestId = resolveRequestId('save-profile', event)
  const openid = wxContext.OPENID
  const ALLOWED_FIELDS = ['displayName', 'gender', 'ageRange', 'roles', 'province', 'city', 'wechatId', 'childAgeRange', 'childDropoutStatus', 'childInterests', 'eduServices', 'bio', 'companionContext', 'allowIncomingRequests', 'isVisibleOnMap']
  const BOOLEAN_FIELDS = ['allowIncomingRequests', 'isVisibleOnMap']
  const ARRAY_FIELDS = ['roles', 'childAgeRange', 'childDropoutStatus']
  const GENDER_WHITELIST = ['男', '女', '其他', '不想说']
  const AGE_RANGE_WHITELIST = ['18-25', '26-35', '36-45', '46-55', '55以上']

  const missingFullPayloadFields = ALLOWED_FIELDS.filter((key) => !hasOwn(event, key))
  if (missingFullPayloadFields.length > 0) return fail(requestId, 'FULL_PAYLOAD_REQUIRED', 'saveProfile 仅支持全量保存，请使用完整资料表单提交')

  const cleanData = { updatedAt: db.serverDate() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      const val = event[key]
      if (ARRAY_FIELDS.includes(key)) cleanData[key] = normalizeStringArray(val)
      else if (BOOLEAN_FIELDS.includes(key)) cleanData[key] = !!val
      else cleanData[key] = String(val).trim()
    }
  }

  cleanData.roles = normalizeRoles(cleanData.roles)

  if (!cleanData.displayName) return fail(requestId, 'DISPLAY_NAME_REQUIRED', '显示名不能为空')
  if (!cleanData.province || !cleanData.city) return fail(requestId, 'CITY_REQUIRED', '请选择所在城市')
  if (cleanData.gender && !GENDER_WHITELIST.includes(cleanData.gender)) return fail(requestId, 'INVALID_GENDER', '性别选项不合法')
  if (cleanData.ageRange && !AGE_RANGE_WHITELIST.includes(cleanData.ageRange)) return fail(requestId, 'INVALID_AGE_RANGE', '年龄段选项不合法')
  if (cleanData.ageRange === '18岁以下') return fail(requestId, 'UNDERAGE_NOT_ALLOWED', '当前仅支持18岁及以上用户注册')
  const selectedRoles = Array.isArray(cleanData.roles) ? cleanData.roles : []
  if (selectedRoles.length === 0) return fail(requestId, 'ROLE_REQUIRED', '请至少选择一个身份')

  cleanData.childAgeRange = normalizeStringArray(cleanData.childAgeRange).filter((item) => CHILD_AGE_WHITELIST.includes(item))
  cleanData.childDropoutStatus = normalizeStringArray(cleanData.childDropoutStatus).filter((item) => CHILD_STATUS_WHITELIST.includes(item))

  const lengthError =
    validateLength('显示名', cleanData.displayName, 30) ||
    validateLength('城市', cleanData.city, 30) ||
    validateLength('简介', cleanData.bio, 200) ||
    validateLength('和生态的关系', cleanData.companionContext, 150) ||
    validateLength('家庭教育关注说明', cleanData.childInterests, 300) ||
    validateLength('教育服务', cleanData.eduServices, 500)
  if (lengthError) return fail(requestId, 'INVALID_LENGTH', lengthError)

  const contactError = validateSearchableContactId(cleanData.wechatId)
  if (contactError) return fail(requestId, 'INVALID_CONTACT_ID', contactError)

  if (!selectedRoles.includes('同行者')) cleanData.companionContext = ''
  if (!selectedRoles.includes('家长')) {
    cleanData.childAgeRange = []
    cleanData.childDropoutStatus = []
    cleanData.childInterests = ''
  }
  if (!selectedRoles.includes('教育者')) cleanData.eduServices = ''

  const securityResult = await runMsgSecCheck({
    content: [cleanData.displayName, cleanData.bio, cleanData.childInterests, cleanData.eduServices, cleanData.companionContext].filter(Boolean).join('\n'),
    openid,
    scene: 1,
  })
  if (!securityResult.ok) return fail(requestId, securityResult.code || 'CONTENT_SECURITY_BLOCKED', securityResult.message)

  const dupCheck = await db.collection('users').where({ displayName: cleanData.displayName, openid: _.neq(openid) }).limit(1).get()
  if (dupCheck.data.length > 0) return fail(requestId, 'DISPLAY_NAME_TAKEN', '这个显示名已被使用，请换一个')

  const existing = await db.collection('users').where({ openid }).limit(20).get()
  const existingDocs = existing.data || []
  const canonicalDoc = existingDocs.find((item) => item._id === openid) || existingDocs[0] || null
  const baseDoc = canonicalDoc ? { ...canonicalDoc } : {}
  delete baseDoc._id

  const dataToSave = {
    ...baseDoc,
    allowIncomingRequests: cleanData.allowIncomingRequests !== false,
    isVisibleOnMap: cleanData.isVisibleOnMap !== false,
    ...cleanData,
    openid,
    createdAt: canonicalDoc?.createdAt || db.serverDate(),
  }

  await db.collection('users').doc(openid).set({ data: dataToSave })
  const staleDocs = existingDocs.filter((item) => item._id !== openid)
  if (staleDocs.length > 0) {
    await Promise.all(staleDocs.map((item) => db.collection('users').doc(item._id).remove().catch(() => null)))
  }
  return ok(requestId, {
    mode: canonicalDoc ? 'update' : 'create',
    profile: normalizeProfile({ ...dataToSave, _id: openid }),
  })
}

async function updatePrivacySettings(event, wxContext) {
  const requestId = resolveRequestId('update-privacy', event)
  const openid = wxContext.OPENID
  const updates = {}
  if (event.allowIncomingRequests !== undefined) updates.allowIncomingRequests = !!event.allowIncomingRequests
  if (event.isVisibleOnMap !== undefined) updates.isVisibleOnMap = !!event.isVisibleOnMap
  if (Object.keys(updates).length === 0) return fail(requestId, 'BAD_REQUEST', '没有可更新的隐私设置')
  try {
    const userDocId = await resolveUserDocId(openid)
    if (!userDocId) return fail(requestId, 'PROFILE_NOT_FOUND', '请先完成个人资料填写')
    await db.collection('users').doc(userDocId).update({ data: { ...updates, updatedAt: db.serverDate() } })
    return ok(requestId, { message: '隐私设置已更新', ...updates })
  } catch (err) {
    console.error('appService updatePrivacySettings error:', err)
    return fail(requestId, 'UPDATE_PRIVACY_SETTINGS_FAILED', '更新隐私设置失败，请稍后重试')
  }
}

async function getSafetyOverview(event, wxContext) {
  const requestId = resolveRequestId('get-safety-overview', event)
  const openid = wxContext.OPENID
  try {
    const res = await db.collection('safety_relations').where({ ownerOpenid: openid }).orderBy('updatedAt', 'desc').limit(100).get()
    const items = (res.data || []).map((item) => ({
      _id: item._id,
      targetUserId: item.targetUserId || '',
      targetName: item.targetName || '',
      targetCity: item.targetCity || '',
      isBlocked: !!item.isBlocked,
      isMuted: !!item.isMuted,
      updatedAt: item.updatedAt || null,
    }))
    return ok(requestId, { blocked: items.filter((item) => item.isBlocked), muted: items.filter((item) => item.isMuted) })
  } catch (err) {
    console.error('appService getSafetyOverview error:', err)
    return fail(requestId, 'GET_SAFETY_OVERVIEW_FAILED', '读取安全设置失败', { blocked: [], muted: [] })
  }
}

async function getMapUsers(event, wxContext) {
  const requestId = resolveRequestId('get-map-users', event)
  const openid = wxContext.OPENID
  try {
    const [usersRes, mySafetyRes, blockedByRes] = await Promise.all([
      db.collection('users').where({ province: _.neq(''), city: _.neq(''), displayName: _.neq(''), isVisibleOnMap: _.neq(false) }).field({ displayName: true, roles: true, province: true, city: true, bio: true, companionContext: true, openid: true }).limit(500).get(),
      openid ? db.collection('safety_relations').where({ ownerOpenid: openid }).field({ targetOpenid: true, isBlocked: true, isMuted: true }).limit(500).get() : Promise.resolve({ data: [] }),
      openid ? db.collection('safety_relations').where({ targetOpenid: openid, isBlocked: true }).field({ ownerOpenid: true }).limit(500).get() : Promise.resolve({ data: [] }),
    ])
    const hiddenOpenids = new Set((mySafetyRes.data || []).filter((item) => item.isBlocked || item.isMuted).map((item) => item.targetOpenid).filter(Boolean))
    const blockedByOpenids = new Set((blockedByRes.data || []).map((item) => item.ownerOpenid).filter(Boolean))
    const users = (usersRes.data || []).filter((user) => {
      if (user.openid !== openid && hiddenOpenids.has(user.openid)) return false
      if (user.openid !== openid && blockedByOpenids.has(user.openid)) return false
      return true
    }).map((user) => ({ _id: user._id, displayName: user.displayName, roles: normalizeRoles(user.roles), province: user.province, city: user.city, bio: user.bio, companionContext: user.companionContext || '', isSelf: user.openid === openid }))
    return ok(requestId, { users })
  } catch (err) {
    console.error('appService getMapUsers error:', err)
    return fail(requestId, 'GET_MAP_USERS_FAILED', '读取地图用户失败', { users: [] })
  }
}

async function sendRequest(event, wxContext) {
  const requestId = resolveRequestId('send-request', event)
  const myOpenid = wxContext.OPENID
  const targetUserId = String(event.targetUserId || '').trim()
  if (!targetUserId) return fail(requestId, 'TARGET_REQUIRED', '缺少目标用户')
  const me = await getUserProfileByOpenid(myOpenid)
  if (!me) return fail(requestId, 'PROFILE_REQUIRED', '请先填写你的资料')
  let target
  try { target = (await db.collection('users').doc(targetUserId).get()).data } catch (err) { return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户') }
  if (!target || !target.openid) return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户')
  if (target.openid === myOpenid) return fail(requestId, 'SELF_REQUEST_NOT_ALLOWED', '不能给自己发联络请求哦')
  if (target.allowIncomingRequests === false) return fail(requestId, 'TARGET_PAUSED_REQUESTS', '对方当前暂停接收联络')
  const mySafetyRes = await db.collection('safety_relations').where({ ownerOpenid: myOpenid, targetOpenid: target.openid, isBlocked: true }).limit(1).get()
  if (mySafetyRes.data.length > 0) return fail(requestId, 'YOU_BLOCKED_TARGET', '你已拉黑该用户，需先解除拉黑')
  const targetSafetyRes = await db.collection('safety_relations').where({ ownerOpenid: target.openid, targetOpenid: myOpenid, isBlocked: true }).limit(1).get()
  if (targetSafetyRes.data.length > 0) return fail(requestId, 'TARGET_BLOCKED_YOU', '当前无法向该用户发起联络')
  const connectionId = buildConnectionDocId(myOpenid, target.openid)
  const reverseConnectionId = buildConnectionDocId(target.openid, myOpenid)
  let sameDirectionRecord = null
  try { sameDirectionRecord = (await db.collection('connections').doc(connectionId).get()).data || null } catch (err) { sameDirectionRecord = null }
  if (sameDirectionRecord?.status === 'pending') return fail(requestId, 'REQUEST_ALREADY_PENDING', '你已经发送过请求了，等待对方回应')
  if (sameDirectionRecord?.status === 'accepted') return fail(requestId, 'ALREADY_CONNECTED', '你们已经是联络人了')
  if (sameDirectionRecord?.status === 'rejected') {
    const cooldownDays = getCooldownRemainingDays(sameDirectionRecord.respondedAt || sameDirectionRecord.updatedAt)
    if (cooldownDays > 0) {
      return fail(requestId, 'REJECTED_COOLDOWN', `对方近期已拒绝你的联络请求，请 ${cooldownDays} 天后再试`)
    }
  }
  let reverseRecord = null
  try { reverseRecord = (await db.collection('connections').doc(reverseConnectionId).get()).data || null } catch (err) { reverseRecord = null }
  if (reverseRecord?.status === 'accepted') return fail(requestId, 'ALREADY_CONNECTED', '你们已经是联络人了')
  if (reverseRecord?.status === 'pending') return fail(requestId, 'REVERSE_PENDING_EXISTS', '对方已经向你发起请求，请先处理对方的联络请求')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [dailyCountRes, sameTargetCountRes] = await Promise.all([
    db.collection('connections').where({ fromOpenid: myOpenid, createdAt: _.gte(since) }).count(),
    db.collection('connections').where({ fromOpenid: myOpenid, toOpenid: target.openid, createdAt: _.gte(since) }).count(),
  ])
  if ((dailyCountRes?.total || 0) >= DAILY_LIMIT) return fail(requestId, 'DAILY_LIMIT_REACHED', '24小时内发起联络次数过多，请稍后再试')
  if ((sameTargetCountRes?.total || 0) >= SAME_TARGET_DAILY_LIMIT) return fail(requestId, 'SAME_TARGET_LIMIT_REACHED', '24小时内你已多次尝试联系该用户，请稍后再试')
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
  return ok(requestId, { connectionId, message: '联络请求已发送' })
}

async function getMyRequests(event, wxContext) {
  const requestId = resolveRequestId('get-my-requests', event)
  const myOpenid = wxContext.OPENID
  try {
    const safetyRes = await db.collection('safety_relations').where({ ownerOpenid: myOpenid }).field({ targetOpenid: true, isBlocked: true, isMuted: true }).limit(200).get()
    const hiddenOpenidSet = new Set((safetyRes.data || []).filter((item) => item.isBlocked || item.isMuted).map((item) => item.targetOpenid).filter(Boolean))
    const pendingRes = await db.collection('connections').where({ toOpenid: myOpenid, status: 'pending' }).field({ _id: true, fromOpenid: true, fromUserId: true, fromName: true, fromCity: true, fromRoles: true, fromBio: true, createdAt: true }).orderBy('createdAt', 'desc').limit(50).get()
    const pending = (pendingRes.data || []).filter((item) => !hiddenOpenidSet.has(item.fromOpenid)).map((item) => ({ _id: item._id, fromUserId: item.fromUserId || '', fromName: item.fromName, fromCity: item.fromCity, fromRoles: normalizeRoles(item.fromRoles || []), fromBio: item.fromBio, createdAt: item.createdAt }))
    const [acceptedFrom, acceptedTo] = await Promise.all([
      db.collection('connections').where({ fromOpenid: myOpenid, status: 'accepted' }).field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true }).limit(50).get(),
      db.collection('connections').where({ toOpenid: myOpenid, status: 'accepted' }).field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true }).limit(50).get(),
    ])
    const allAccepted = [...acceptedFrom.data, ...acceptedTo.data]
    const otherOpenids = Array.from(new Set(allAccepted.map((conn) => (conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid)).filter((oid) => oid && !hiddenOpenidSet.has(oid))))
    const usersRes = otherOpenids.length > 0 ? await db.collection('users').where({ openid: _.in(otherOpenids) }).field({ _id: true, openid: true, displayName: true, city: true, roles: true, bio: true, wechatId: true, childAgeRange: true, childDropoutStatus: true, childInterests: true, eduServices: true }).limit(Math.min(otherOpenids.length, 100)).get() : { data: [] }
    const userMap = new Map((usersRes.data || []).map((user) => [user.openid, user]))
    const enrichedAccepted = allAccepted.reduce((acc, conn) => {
      const otherOpenid = conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid
      if (hiddenOpenidSet.has(otherOpenid)) return acc
      const otherUserId = conn.fromOpenid === myOpenid ? conn.toUserId : conn.fromUserId
      const otherBasicName = conn.fromOpenid === myOpenid ? conn.toName : conn.fromName
      const other = userMap.get(otherOpenid) || {}
      const otherRoles = normalizeRoles(other.roles || [])
      acc.push({
        _id: conn._id,
        otherUserId: other._id || otherUserId || '',
        otherName: other.displayName || otherBasicName,
        otherCity: other.city || '',
        otherRoles,
        otherBio: other.bio || '',
        otherWechat: other.wechatId || '',
        otherChildInfo: otherRoles.includes('家长') ? { ageRange: normalizeStringArray(other.childAgeRange), status: normalizeStringArray(other.childDropoutStatus), interests: other.childInterests || '' } : null,
        otherEduServices: otherRoles.includes('教育者') ? (other.eduServices || '') : '',
        respondedAt: conn.respondedAt,
      })
      return acc
    }, [])
    const sentRes = await db.collection('connections').where({ fromOpenid: myOpenid, status: 'pending' }).field({ _id: true, toOpenid: true, toUserId: true, toName: true, toCity: true, status: true, createdAt: true }).orderBy('createdAt', 'desc').limit(50).get()
    const sent = (sentRes.data || []).filter((item) => !hiddenOpenidSet.has(item.toOpenid)).map((item) => ({ _id: item._id, toUserId: item.toUserId || '', toName: item.toName, toCity: item.toCity, status: item.status, createdAt: item.createdAt }))
    return ok(requestId, { pending, accepted: enrichedAccepted, sent })
  } catch (err) {
    console.error('appService getMyRequests error:', err)
    return fail(requestId, 'GET_MY_REQUESTS_FAILED', '读取联络动态失败', { pending: [], accepted: [], sent: [] })
  }
}

async function respondRequest(event, wxContext) {
  const requestId = resolveRequestId('respond-request', event)
  const myOpenid = wxContext.OPENID
  const connectionId = String(event.requestId || '').trim()
  const action = String(event.action || '').trim()
  if (!connectionId || !action) return fail(requestId, 'BAD_REQUEST', '参数缺失')
  if (!['accept', 'reject'].includes(action)) return fail(requestId, 'INVALID_ACTION', '无效操作')
  let conn
  try { conn = (await db.collection('connections').doc(connectionId).get()).data } catch (err) { return fail(requestId, 'CONNECTION_NOT_FOUND', '找不到该请求') }
  if (conn.toOpenid !== myOpenid) return fail(requestId, 'FORBIDDEN', '无权操作此请求')
  if (conn.status !== 'pending') return fail(requestId, 'REQUEST_ALREADY_PROCESSED', '该请求已处理过了')
  const nextStatus = action === 'accept' ? 'accepted' : 'rejected'
  await db.collection('connections').doc(connectionId).update({ data: { status: nextStatus, respondedAt: db.serverDate(), updatedAt: db.serverDate() } })
  return ok(requestId, { nextStatus, message: action === 'accept' ? '已同意联络请求' : '已忽略该请求' })
}

async function manageConnection(event, wxContext) {
  const requestId = resolveRequestId('manage-connection', event)
  const openid = wxContext.OPENID
  const connectionId = String(event.connectionId || '').trim()
  const action = String(event.action || '').trim()
  if (!connectionId || !action) return fail(requestId, 'BAD_REQUEST', '参数缺失')
  if (!['withdraw', 'remove_connection'].includes(action)) return fail(requestId, 'INVALID_ACTION', '无效操作')
  let conn
  try { conn = (await db.collection('connections').doc(connectionId).get()).data } catch (err) { return fail(requestId, 'CONNECTION_NOT_FOUND', '找不到该连接记录') }
  if (!conn) return fail(requestId, 'CONNECTION_NOT_FOUND', '找不到该连接记录')
  if (action === 'withdraw') {
    if (conn.fromOpenid !== openid) return fail(requestId, 'FORBIDDEN', '只有发送方可以撤回请求')
    if (conn.status !== 'pending') return fail(requestId, 'INVALID_STATUS', '只能撤回待处理请求')
    await db.collection('connections').doc(connectionId).update({ data: { status: 'withdrawn', withdrawnAt: db.serverDate(), updatedAt: db.serverDate() } })
    return ok(requestId, { message: '已撤回请求', nextStatus: 'withdrawn' })
  }
  if (conn.status !== 'accepted') return fail(requestId, 'INVALID_STATUS', '只能删除已建立的连接')
  if (conn.fromOpenid !== openid && conn.toOpenid !== openid) return fail(requestId, 'FORBIDDEN', '无权删除这条连接')
  await db.collection('connections').doc(connectionId).update({ data: { status: 'removed', removedAt: db.serverDate(), removedBy: openid, updatedAt: db.serverDate() } })
  return ok(requestId, { message: '已删除连接', nextStatus: 'removed' })
}

async function manageSafetyRelation(event, wxContext) {
  const requestId = resolveRequestId('manage-safety', event)
  const openid = wxContext.OPENID
  const targetUserId = String(event.targetUserId || '').trim()
  const action = String(event.action || '').trim()
  if (!targetUserId || !action) return fail(requestId, 'BAD_REQUEST', '参数缺失')
  if (!['block', 'unblock', 'mute', 'unmute'].includes(action)) return fail(requestId, 'INVALID_ACTION', '无效操作')
  let target
  try { target = (await db.collection('users').doc(targetUserId).get()).data } catch (err) { return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户') }
  if (!target || !target.openid) return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户')
  if (target.openid === openid) return fail(requestId, 'SELF_ACTION_NOT_ALLOWED', '不能对自己执行这个操作')
  const stableDocId = buildSafetyDocId(openid, target.openid)
  let existing = null
  try { existing = (await db.collection('safety_relations').doc(stableDocId).get()).data || null } catch (err) { existing = null }
  let legacyDocs = []
  if (!existing) {
    const existingRes = await db.collection('safety_relations').where({ ownerOpenid: openid, targetOpenid: target.openid }).limit(20).get()
    legacyDocs = existingRes.data || []
    existing = legacyDocs.find((item) => item._id === stableDocId) || legacyDocs[0] || null
  }
  const currentBlocked = !!existing?.isBlocked
  const currentMuted = !!existing?.isMuted
  let nextBlocked = currentBlocked
  let nextMuted = currentMuted
  if (action === 'block') nextBlocked = true
  if (action === 'unblock') nextBlocked = false
  if (action === 'mute') nextMuted = true
  if (action === 'unmute') nextMuted = false
  try {
    if (!nextBlocked && !nextMuted) {
      if (existing?._id) await db.collection('safety_relations').doc(existing._id).remove().catch(() => null)
      await Promise.all(legacyDocs.filter((item) => item._id !== existing?._id).map((item) => db.collection('safety_relations').doc(item._id).remove().catch(() => null)))
      return ok(requestId, { message: action === 'unblock' ? '已解除拉黑' : '已取消静音', isBlocked: false, isMuted: false })
    }
    await db.collection('safety_relations').doc(stableDocId).set({ data: { ownerOpenid: openid, targetOpenid: target.openid, targetUserId, targetName: target.displayName || '', targetCity: target.city || '', isBlocked: nextBlocked, isMuted: nextMuted, updatedAt: db.serverDate(), createdAt: existing?.createdAt || db.serverDate() } })
    await Promise.all(legacyDocs.filter((item) => item._id !== stableDocId).map((item) => db.collection('safety_relations').doc(item._id).remove().catch(() => null)))
    if (action === 'block') {
      const [forwardRes, backwardRes] = await Promise.all([
        db.collection('connections').where({ fromOpenid: openid, toOpenid: target.openid, status: _.in(['pending', 'accepted']) }).get(),
        db.collection('connections').where({ fromOpenid: target.openid, toOpenid: openid, status: _.in(['pending', 'accepted']) }).get(),
      ])
      const toRemove = [...(forwardRes.data || []), ...(backwardRes.data || [])]
      await Promise.all(toRemove.map((conn) => db.collection('connections').doc(conn._id).update({ data: { status: 'removed', removedAt: db.serverDate(), removedBy: openid, updatedAt: db.serverDate() } }).catch(() => null)))
    }
    return ok(requestId, { message: action === 'block' ? '已拉黑该用户' : action === 'unblock' ? '已解除拉黑' : action === 'mute' ? '已静音该用户' : '已取消静音', isBlocked: nextBlocked, isMuted: nextMuted })
  } catch (err) {
    console.error('appService manageSafetyRelation error:', err)
    return fail(requestId, 'MANAGE_SAFETY_FAILED', '操作失败，请稍后重试')
  }
}

async function reportUser(event, wxContext) {
  const requestId = resolveRequestId('report-user', event)
  const openid = wxContext.OPENID
  const targetUserId = String(event.targetUserId || '').trim()
  const reason = String(event.reason || '').trim()
  const note = String(event.note || '').trim()
  if (!targetUserId) return fail(requestId, 'TARGET_REQUIRED', '缺少目标用户')
  if (reason && !REASON_WHITELIST.includes(reason)) return fail(requestId, 'INVALID_REASON', '举报原因不合法')
  if (note.length > 1000) return fail(requestId, 'NOTE_TOO_LONG', '举报说明不能超过1000字')
  let target
  try { target = (await db.collection('users').doc(targetUserId).get()).data } catch (err) { return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户') }
  if (!target || !target.openid) return fail(requestId, 'TARGET_NOT_FOUND', '找不到该用户')
  if (target.openid === openid) return fail(requestId, 'SELF_REPORT_NOT_ALLOWED', '不能举报自己')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const duplicateRes = await db.collection('user_reports').where({ reporterOpenid: openid, targetOpenid: target.openid, createdAt: _.gte(since) }).limit(1).get()
  if (duplicateRes.data.length > 0) return fail(requestId, 'DUPLICATE_REPORT', '24小时内你已经举报过该用户，无需重复提交')
  if (note) {
    const securityResult = await runMsgSecCheck({ content: note, openid, scene: 2, maxLen: 1000, blockedMessage: '举报说明包含不合规信息，请修改后重试', failedMessage: '举报说明审核失败，请稍后重试' })
    if (!securityResult.ok) return fail(requestId, securityResult.code || 'CONTENT_SECURITY_BLOCKED', securityResult.message)
  }
  try {
    await db.collection('user_reports').add({ data: { reporterOpenid: openid, targetOpenid: target.openid, targetUserId, targetName: target.displayName || '', reason: reason || '未分类', note, status: 'pending', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    return ok(requestId, { message: '举报已提交，感谢反馈' })
  } catch (err) {
    console.error('appService reportUser error:', err)
    return fail(requestId, 'REPORT_USER_FAILED', '举报失败，请稍后重试')
  }
}

module.exports = {
  getMe,
  saveProfile,
  updatePrivacySettings,
  getSafetyOverview,
  getMapUsers,
  sendRequest,
  getMyRequests,
  respondRequest,
  manageConnection,
  manageSafetyRelation,
  reportUser,
}
