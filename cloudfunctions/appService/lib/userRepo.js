const { db } = require('./cloud')

async function getUserProfileByOpenid(openid, fields = null) {
  try {
    let docQuery = db.collection('users').doc(openid)
    const docRes = await docQuery.get()
    if (!docRes.data) return null

    if (!fields) return docRes.data
    const picked = {}
    fields.forEach((key) => { picked[key] = docRes.data[key] })
    picked._id = docRes.data._id
    picked.openid = docRes.data.openid
    return picked
  } catch (err) {
    return null
  }
}

async function resolveUserDocId(openid) {
  try {
    const docRes = await db.collection('users').doc(openid).get()
    return docRes.data ? openid : ''
  } catch (err) {
    return ''
  }
}

async function getActiveAdmin(openid) {
  const res = await db.collection('admin_users')
    .where({ openid, isActive: true })
    .limit(1)
    .get()
  return res.data[0] || null
}

module.exports = {
  getUserProfileByOpenid,
  resolveUserDocId,
  getActiveAdmin,
}
