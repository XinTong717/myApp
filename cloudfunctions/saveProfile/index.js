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
  'childGender',
  'childAgeRange',
  'childDropoutStatus',
  'childInterests',
  'eduServices',
  'bio',
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const cleanData = { updatedAt: new Date() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      const val = event[key]
      if (Array.isArray(val)) {
        cleanData[key] = val.map((v) => String(v).trim()).filter(Boolean)
      } else {
        cleanData[key] = String(val).trim()
      }
    }
  }

  if (!cleanData.displayName) {
    return { ok: false, message: '显示名不能为空' }
  }

  if (cleanData.ageRange === '18岁以下') {
    return { ok: false, message: '当前仅支持18岁及以上用户注册' }
  }

  const selectedRoles = Array.isArray(cleanData.roles) ? cleanData.roles : []
  if (selectedRoles.includes('学生')) {
    return { ok: false, message: '当前仅开放家长、教育者及其他成年用户' }
  }

  // 显示名查重
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
    .where({ openid: openid })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    await db.collection('users').doc(existing.data[0]._id).update({
      data: cleanData,
    })
    return { ok: true, mode: 'update', openid }
  }

  await db.collection('users').add({
    data: { ...cleanData, openid: openid, createdAt: new Date() },
  })
  return { ok: true, mode: 'create', openid }
}