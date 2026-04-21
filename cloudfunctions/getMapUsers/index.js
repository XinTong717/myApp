const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [usersRes, mySafetyRes, blockedByRes] = await Promise.all([
      db.collection('users')
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
          openid: true,
          isVisibleOnMap: true,
        })
        .limit(500)
        .get(),
      OPENID ? db.collection('safety_relations')
        .where({ ownerOpenid: OPENID })
        .field({ targetOpenid: true, isBlocked: true, isMuted: true })
        .limit(500)
        .get() : Promise.resolve({ data: [] }),
      OPENID ? db.collection('safety_relations')
        .where({ targetOpenid: OPENID, isBlocked: true })
        .field({ ownerOpenid: true })
        .limit(500)
        .get() : Promise.resolve({ data: [] }),
    ])

    const hiddenOpenids = new Set(
      (mySafetyRes.data || [])
        .filter((item) => item.isBlocked || item.isMuted)
        .map((item) => item.targetOpenid)
        .filter(Boolean)
    )
    const blockedByOpenids = new Set(
      (blockedByRes.data || []).map((item) => item.ownerOpenid).filter(Boolean)
    )

    const users = (usersRes.data || []).filter((user) => {
      if (user.isVisibleOnMap === false) return false
      if (user.openid !== OPENID && hiddenOpenids.has(user.openid)) return false
      if (user.openid !== OPENID && blockedByOpenids.has(user.openid)) return false
      return true
    }).map((user) => ({
      _id: user._id,
      displayName: user.displayName,
      roles: user.roles,
      province: user.province,
      city: user.city,
      bio: user.bio,
      isSelf: user.openid === OPENID,
    }))

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
