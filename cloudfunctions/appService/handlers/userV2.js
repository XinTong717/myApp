const { db, _ } = require('../lib/cloud')
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

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function buildSafetyDocId(ownerOpenid, targetOpenid) {
  return `safety_${ownerOpenid}_${targetOpenid}`
}

function validatePublicChannel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length > 120) return '公开渠道不能超过120字'
  if (/\b(?:https?:\/\/)?(?:t\.me|telegram\.me|wa\.me)\b/i.test(text)) return '暂不支持填写境外即时通讯链接'
  return ''
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
  const ALLOWED_FIELDS = ['displayName', 'gender', 'ageRange', 'roles', 'province', 'city', 'publicChannel', 'publicChannelNote', 'childAgeRange', 'childDropoutStatus', 'childInterests', 'eduServices', 'bio', 'companionContext', 'expandedProfileVisible', 'isVisibleOnMap']
  const BOOLEAN_FIELDS = ['expandedProfileVisible', 'isVisibleOnMap']
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
    validateLength('教育服务', cleanData.eduServices, 500) ||
    validateLength('公开渠道备注', cleanData.publicChannelNote, 120)
  if (lengthError) return fail(requestId, 'INVALID_LENGTH', lengthError)

  const publicChannelError = validatePublicChannel(cleanData.publicChannel)
  if (publicChannelError) return fail(requestId, 'INVALID_PUBLIC_CHANNEL', publicChannelError)

  if (!selectedRoles.includes('同行者')) cleanData.companionContext = ''
  if (!selectedRoles.includes('家长')) {
    cleanData.childAgeRange = []
    cleanData.childDropoutStatus = []
    cleanData.childInterests = ''
  }
  if (!selectedRoles.includes('教育者')) cleanData.eduServices = ''

  const securityResult = await runMsgSecCheck({
    content: [cleanData.displayName, cleanData.bio, cleanData.publicChannel, cleanData.publicChannelNote, cleanData.childInterests, cleanData.eduServices, cleanData.companionContext].filter(Boolean).join('\n'),
    openid,
    scene: 1,
    softPassOnFailure: true,
  })
  if (!securityResult.ok) return fail(requestId, securityResult.code || 'CONTENT_SECURITY_BLOCKED', securityResult.message)

  const dataToSave = {
    expandedProfileVisible: cleanData.expandedProfileVisible !== false,
    isVisibleOnMap: cleanData.isVisibleOnMap !== false,
    ...cleanData,
    openid,
    profileContentSecurityStatus: securityResult.contentSecurityStatus || 'unknown',
    profileContentSecuritySuggest: securityResult.contentSecuritySuggest || '',
    profileContentSecurityLabel: securityResult.contentSecurityLabel || '',
    profileContentSecurityErrorCode: securityResult.contentSecurityErrorCode || 0,
    profileContentSecurityError: securityResult.contentSecurityError || '',
    deletionRequestedAt: null,
    deletionStatus: '',
  }

  let mode = 'update'
  try {
    await db.collection('users').doc(openid).update({ data: dataToSave })
  } catch (err) {
    mode = 'create'
    await db.collection('users').doc(openid).set({
      data: {
        ...dataToSave,
        createdAt: db.serverDate(),
      },
    })
  }

  return ok(requestId, {
    mode,
    profile: normalizeProfile({ ...dataToSave, _id: openid }),
  })
}

async function updatePrivacySettings(event, wxContext) {
  const requestId = resolveRequestId('update-privacy', event)
  const openid = wxContext.OPENID
  const updates = {}
  if (event.expandedProfileVisible !== undefined) updates.expandedProfileVisible = !!event.expandedProfileVisible
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

async function requestAccountDeletion(event, wxContext) {
  const requestId = resolveRequestId('request-account-deletion', event)
  const openid = wxContext.OPENID
  const note = String(event.note || '').trim()

  if (note.length > 500) return fail(requestId, 'NOTE_TOO_LONG', '注销说明不能超过500字')

  try {
    if (note) {
      const securityResult = await runMsgSecCheck({
        content: note,
        openid,
        scene: 2,
        maxLen: 500,
        blockedMessage: '注销说明包含不合规信息，请修改后重试',
        failedMessage: '注销说明审核失败，请稍后重试',
      })
      if (!securityResult.ok) return fail(requestId, securityResult.code || 'CONTENT_SECURITY_BLOCKED', securityResult.message)
    }

    const userDocId = await resolveUserDocId(openid)
    const profile = userDocId ? await getUserProfileByOpenid(openid) : null

    await db.collection('account_deletion_requests').add({
      data: {
        openid,
        userDocId: userDocId || '',
        displayName: profile?.displayName || '',
        city: profile?.city || '',
        note,
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    if (userDocId) {
      await db.collection('users').doc(userDocId).update({
        data: {
          displayName: '已注销用户',
          gender: '',
          ageRange: '',
          roles: [],
          publicChannel: '',
          publicChannelNote: '',
          bio: '',
          companionContext: '',
          childAgeRange: [],
          childDropoutStatus: [],
          childInterests: '',
          eduServices: '',
          expandedProfileVisible: false,
          isVisibleOnMap: false,
          deletionStatus: 'pending',
          deletionRequestedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
    }

    return ok(requestId, { message: '注销申请已提交。你的公开资料已先匿名化并从地图隐藏，公开渠道已清空。' })
  } catch (err) {
    console.error('appService requestAccountDeletion error:', err)
    return fail(requestId, 'REQUEST_ACCOUNT_DELETION_FAILED', '提交注销申请失败，请稍后重试')
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
      await db.collection('safety_relations').doc(stableDocId).remove().catch(() => null)
      return ok(requestId, { message: action === 'unblock' ? '已解除拉黑' : '已取消静音', isBlocked: false, isMuted: false })
    }
    await db.collection('safety_relations').doc(stableDocId).set({ data: { ownerOpenid: openid, targetOpenid: target.openid, targetUserId, targetName: target.displayName || '', targetCity: target.city || '', isBlocked: nextBlocked, isMuted: nextMuted, updatedAt: db.serverDate(), createdAt: existing?.createdAt || db.serverDate() } })
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
  requestAccountDeletion,
  getSafetyOverview,
  manageSafetyRelation,
  reportUser,
}
