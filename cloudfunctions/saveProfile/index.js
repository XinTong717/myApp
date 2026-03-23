const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 允许保存的字段白名单
const ALLOWED_FIELDS = [
  'displayName',
  'gender',
  'ageRange',
  'roles',          // array: ['家长', '教育者', ...]
  'province',
  'city',
  // 家长相关
  'childGender',
  'childAgeRange',
  'childDropoutStatus',
  'childInterests',
  // 教育者相关
  'eduServices',
  // 通用
  'bio',
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 只保留白名单字段，防止注入
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

  const existing = await db.collection('users')
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    await db.collection('users').doc(existing.data[0]._id).update({
      data: cleanData,
    })
    return { ok: true, mode: 'update', openid }
  }

  await db.collection('users').add({
    data: { ...cleanData, createdAt: new Date() },
  })
  return { ok: true, mode: 'create', openid }
}
