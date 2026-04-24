const { db } = require('./cloud')

async function getUserProfileByOpenid(openid, fields = null) {
  try {
    let docQuery = db.collection('users').doc(openid)
    const docRes = await docQuery.get()
    if (docRes.data) {
      if (!fields) return docRes.data
      const picked = {}
      fields.forEach((key) => { picked[key] = docRes.data[key] })
      picked._id = docRes.data._id
      picked.openid = docRes.data.openid
      return picked
    }
  } catch (err) {
    console.warn('canonical doc lookup missed, fallback to legacy query')
  }

  let query = db.collection('users').where({ openid })
  if (fields) {
    const fieldShape = { _id: true, openid: true }
    fields.forEach((key) => { fieldShape[key] = true })
    query = query.field(fieldShape)
  }
  const legacyRes = await query.limit(1).get()
  return legacyRes.data[0] || null
}

async function resolveUserDocId(openid) {
  try {
    const docRes = await db.collection('users').doc(openid).get()
    if (docRes.data) {
      return openid
    }
  } catch (err) {
    console.warn('resolveUserDocId canonical doc lookup missed, fallback to legacy query')
  }

  const legacyRes = await db.collection('users').where({ openid }).limit(1).get()
  return legacyRes.data[0]?._id || ''
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
