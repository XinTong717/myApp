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

function normalizeRoles(roles) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => String(role).trim())
    .filter(Boolean)
    .map((role) => role === '其他' ? '同行者' : role)
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

  const cleanData = { updatedAt: new Date() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      const val = event[key]
      if (Array.isArray(val)) {
        cleanData[key] = val.map((v) => String(v).trim()).filter(Boolean)
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

  if (cleanData.ageRange === '18岁以下') {
    return { ok: false, message: '当前仅支持18岁及以上用户注册' }
  }

  const selectedRoles = Array.isArray(cleanData.roles) ? cleanData.roles : []
  if (selectedRoles.includes('学生')) {
    return { ok: false, message: '当前仅开放家长、教育者及同行者等成年用户' }
  }

  if (!selectedRoles.includes('同行者')) {
    cleanData.companionContext = ''
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

  if (existing.data.length > 0) {
    await db.collection('users').doc(existing.data[0]._id).update({
      data: dataToSave,
    })
    return { ok: true, mode: 'update', openid }
  }

  await db.collection('users').add({
    data: { ...dataToSave, openid, createdAt: new Date() },
  })
  return { ok: true, mode: 'create', openid }
}
