const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const ALLOWED_FIELDS = [
  'displayName',
  'gender',
  'ageRange',
  'roles',
  'province',
  'city',
  'wechatId',
  'childAgeRange',
  'childDropoutStatus',
  'childInterests',
  'eduServices',
  'bio',
  'companionContext',
  'allowIncomingRequests',
  'isVisibleOnMap',
]

const BOOLEAN_FIELDS = ['allowIncomingRequests', 'isVisibleOnMap']
const ARRAY_FIELDS = ['roles', 'childAgeRange', 'childDropoutStatus']

const ROLE_WHITELIST = ['家长', '教育者', '同行者']
const GENDER_WHITELIST = ['男', '女', '其他', '不想说']
const AGE_RANGE_WHITELIST = ['18-25', '26-35', '36-45', '46-55', '55以上']
const CHILD_AGE_WHITELIST = ['学龄前', '小学阶段', '中学阶段']
const CHILD_STATUS_WHITELIST = ['寻找学习社区', '寻找同伴连接', '寻找项目活动', '寻找家庭支持', '自主探索中']

function normalizeRoles(roles) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => String(role).trim())
    .filter(Boolean)
    .map((role) => role === '其他' ? '同行者' : role)
    .filter((role) => ROLE_WHITELIST.includes(role))
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const text = String(value || '').trim()
  if (!text) return []
  return text.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
}

function normalizeProfile(profile) {
  if (!profile) return null
  return {
    displayName: String(profile.displayName || '').trim(),
    gender: String(profile.gender || '').trim(),
    ageRange: profile.ageRange === '18岁以下' ? '' : String(profile.ageRange || '').trim(),
    roles: normalizeRoles(profile.roles),
    province: String(profile.province || '').trim(),
    city: String(profile.city || '').trim(),
    wechatId: String(profile.wechatId || '').trim(),
    allowIncomingRequests: profile.allowIncomingRequests !== false,
    isVisibleOnMap: profile.isVisibleOnMap !== false,
    childAgeRange: normalizeStringArray(profile.childAgeRange).filter((item) => CHILD_AGE_WHITELIST.includes(item)),
    childDropoutStatus: normalizeStringArray(profile.childDropoutStatus).filter((item) => CHILD_STATUS_WHITELIST.includes(item)),
    childInterests: String(profile.childInterests || '').trim(),
    eduServices: String(profile.eduServices || '').trim(),
    companionContext: String(profile.companionContext || '').trim(),
    bio: String(profile.bio || '').trim(),
    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,
  }
}

function validateLength(label, value, max) {
  const text = String(value || '')
  if (text.length > max) {
    return `${label}不能超过${max}字`
  }
  return ''
}

function validateWechatId(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length < 5 || text.length > 50) return '微信号格式不正确'
  if (!/^[a-zA-Z][-_a-zA-Z0-9]{4,49}$/.test(text)) return '微信号格式不正确'
  return ''
}

async function runMsgSecCheck(content, openid) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return { ok: true }
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, 2500),
      version: 2,
      scene: 1,
      openid,
    })

    const errCode = res?.errCode ?? res?.errcode ?? 0
    if (errCode === 0) {
      return { ok: true }
    }

    console.error('msgSecCheck blocked content:', res)
    return { ok: false, message: '内容包含不合规信息，请修改后重试' }
  } catch (err) {
    console.error('msgSecCheck error:', err)
    return { ok: false, message: '内容审核失败，请稍后重试' }
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const cleanData = { updatedAt: db.serverDate() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      const val = event[key]
      if (ARRAY_FIELDS.includes(key)) {
        cleanData[key] = normalizeStringArray(val)
      } else if (BOOLEAN_FIELDS.includes(key)) {
        cleanData[key] = !!val
      } else {
        cleanData[key] = String(val).trim()
      }
    }
  }

  cleanData.roles = normalizeRoles(cleanData.roles)

  if (!cleanData.displayName) {
    return { ok: false, message: '显示名不能为空' }
  }

  if (!cleanData.province || !cleanData.city) {
    return { ok: false, message: '请选择所在城市' }
  }

  if (cleanData.gender && !GENDER_WHITELIST.includes(cleanData.gender)) {
    return { ok: false, message: '性别选项不合法' }
  }

  if (cleanData.ageRange && !AGE_RANGE_WHITELIST.includes(cleanData.ageRange)) {
    return { ok: false, message: '年龄段选项不合法' }
  }

  if (cleanData.ageRange === '18岁以下') {
    return { ok: false, message: '当前仅支持18岁及以上用户注册' }
  }

  const selectedRoles = Array.isArray(cleanData.roles) ? cleanData.roles : []
  if (selectedRoles.length === 0) {
    return { ok: false, message: '请至少选择一个身份' }
  }

  cleanData.childAgeRange = normalizeStringArray(cleanData.childAgeRange).filter((item) => CHILD_AGE_WHITELIST.includes(item))
  cleanData.childDropoutStatus = normalizeStringArray(cleanData.childDropoutStatus).filter((item) => CHILD_STATUS_WHITELIST.includes(item))

  const lengthError =
    validateLength('显示名', cleanData.displayName, 30) ||
    validateLength('城市', cleanData.city, 30) ||
    validateLength('简介', cleanData.bio, 200) ||
    validateLength('和生态的关系', cleanData.companionContext, 150) ||
    validateLength('家庭教育关注说明', cleanData.childInterests, 300) ||
    validateLength('教育服务', cleanData.eduServices, 500)

  if (lengthError) {
    return { ok: false, message: lengthError }
  }

  const wechatError = validateWechatId(cleanData.wechatId)
  if (wechatError) {
    return { ok: false, message: wechatError }
  }

  if (!selectedRoles.includes('同行者')) {
    cleanData.companionContext = ''
  }
  if (!selectedRoles.includes('家长')) {
    cleanData.childAgeRange = []
    cleanData.childDropoutStatus = []
    cleanData.childInterests = ''
  }
  if (!selectedRoles.includes('教育者')) {
    cleanData.eduServices = ''
  }

  const securityResult = await runMsgSecCheck([
    cleanData.displayName,
    cleanData.bio,
    cleanData.childInterests,
    cleanData.eduServices,
    cleanData.companionContext,
  ].filter(Boolean).join('\n'), openid)

  if (!securityResult.ok) {
    return securityResult
  }

  const dupCheck = await db.collection('users')
    .where({
      displayName: cleanData.displayName,
      openid: _.neq(openid),
    })
    .limit(1)
    .get()

  if (dupCheck.data.length > 0) {
    return { ok: false, message: '这个显示名已被使用，请换一个' }
  }

  const existing = await db.collection('users')
    .where({ openid })
    .limit(1)
    .get()

  const dataToSave = {
    allowIncomingRequests: cleanData.allowIncomingRequests !== false,
    isVisibleOnMap: cleanData.isVisibleOnMap !== false,
    ...cleanData,
  }

  let docId = ''
  if (existing.data.length > 0) {
    docId = existing.data[0]._id
    await db.collection('users').doc(docId).update({
      data: dataToSave,
    })
  } else {
    const addRes = await db.collection('users').add({
      data: { ...dataToSave, openid, createdAt: db.serverDate() },
    })
    docId = addRes._id
  }

  const latest = await db.collection('users').doc(docId).get()
  return {
    ok: true,
    mode: existing.data.length > 0 ? 'update' : 'create',
    profile: normalizeProfile(latest.data || null),
  }
}
