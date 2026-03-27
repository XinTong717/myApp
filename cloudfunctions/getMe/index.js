const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const res = await db.collection('users')
    .where({ openid: openid })
    .limit(1)
    .get()

  return {
    openid,
    profile: res.data[0] || null,
  }
}