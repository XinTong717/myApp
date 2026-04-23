const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const ROLE_WHITELIST = ['家长', '教育者', '同行者']
const CHILD_AGE_WHITELIST = ['学龄前', '小学阶段', '中学阶段']
const CHILD_STATUS_WHITELIST = ['寻找学习社区', '寻找同伴连接', '寻找项目活动', '寻找家庭支持', '自主探索中']

function createRequestId() {
  return `get-me-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveRequestId(event) {
  const clientRequestId = String(event?.clientRequestId || '').trim()
  return clientRequestId || createRequestId()
}

function normalizeRoles(roles) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => String(role).trim())
    .filter(Boolean)
    .map((role) => (role === '其他' ? '同行者' : role))
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

async function getUserProfileByOpenid(openid) {
  try {
    const docRes = await db.collection('users').doc(openid).get()
    if (docRes.data) {
      return docRes.data
    }
  } catch (err) {
    console.warn('getMe canonical doc lookup missed, fallback to legacy query')
  }

  const legacyRes = await db.collection('users')
    .where({ openid })
    .limit(1)
    .get()

  return legacyRes.data[0] || null
}

exports.main = async (event) => {
  const requestId = resolveRequestId(event)

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const profile = await getUserProfileByOpenid(openid)

    return {
      ok: true,
      code: 'OK',
      requestId,
      profile: normalizeProfile(profile),
    }
  } catch (err) {
    console.error('getMe error:', err)
    return {
      ok: false,
      code: 'GET_ME_FAILED',
      requestId,
      message: '读取个人资料失败，请稍后重试',
      profile: null,
    }
  }
}
