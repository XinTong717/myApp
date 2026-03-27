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
      })
      .limit(500)
      .get()

    return {
      ok: true,
      users: res.data || [],
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