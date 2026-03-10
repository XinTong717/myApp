const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const {
    displayName = '',
    role = '',
    city = '',
    bio = '',
    contact = '',
  } = event || {}

  const cleanData = {
    displayName: String(displayName).trim(),
    role: String(role).trim(),
    city: String(city).trim(),
    bio: String(bio).trim(),
    contact: String(contact).trim(),
    updatedAt: new Date(),
  }

  if (!cleanData.displayName) {
    return {
      ok: false,
      message: 'displayName 不能为空',
    }
  }

  const existing = await db.collection('users')
    .where({ _openid: openid })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    const docId = existing.data[0]._id

    await db.collection('users').doc(docId).update({
      data: cleanData,
    })

    return {
      ok: true,
      mode: 'update',
      openid,
    }
  }

  await db.collection('users').add({
    data: {
      ...cleanData,
      createdAt: new Date(),
    },
  })

  return {
    ok: true,
    mode: 'create',
    openid,
  }
}