const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const res = await db.collection('users')
      .where({
        province: _.neq(''),
        city: _.neq(''),
        displayName: _.neq(''),
      })
      .field({
        displayName: true,
        roles: true,
        province: true,
        city: true,
        bio: true,
        ageRange: true,
      })
      .limit(500)
      .get()

    const users = (res.data || []).filter((user) => {
      const roles = Array.isArray(user.roles) ? user.roles : []
      return user.ageRange !== '18岁以下' && !roles.includes('学生')
    })

    return {
      ok: true,
      users,
    }
  } catch (err) {
    console.error('getMapUsers error:', err)
    return {
      ok: false,
      users: [],
      error: err.message,
    }
  }
}