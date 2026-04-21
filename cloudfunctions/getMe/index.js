const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const res = await db.collection('users')
    .where({ openid })
    .limit(1)
    .get()

  return {
    profile: res.data[0] || null,
  }
}
