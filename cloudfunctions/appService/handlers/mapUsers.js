const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles } = require('../lib/normalize')

const MAP_USERS_DEFAULT_LIMIT = 120
const MAP_USERS_PROVINCE_LIMIT = 300

function normalizeProvince(value) {
  return String(value || '').trim()
}

async function getMapUsers(event, wxContext) {
  const requestId = resolveRequestId('get-map-users', event)
  const openid = wxContext.OPENID
  const province = normalizeProvince(event.province)
  const limit = province ? MAP_USERS_PROVINCE_LIMIT : MAP_USERS_DEFAULT_LIMIT

  try {
    const userWhere = {
      province: province || _.neq(''),
      city: _.neq(''),
      displayName: _.neq(''),
      isVisibleOnMap: _.neq(false),
    }

    const [usersRes, mySafetyRes, blockedByRes] = await Promise.all([
      db.collection('users')
        .where(userWhere)
        .field({ displayName: true, roles: true, province: true, city: true, bio: true, companionContext: true, openid: true })
        .limit(limit)
        .get(),
      openid
        ? db.collection('safety_relations')
          .where({ ownerOpenid: openid })
          .field({ targetOpenid: true, isBlocked: true, isMuted: true })
          .limit(500)
          .get()
        : Promise.resolve({ data: [] }),
      openid
        ? db.collection('safety_relations')
          .where({ targetOpenid: openid, isBlocked: true })
          .field({ ownerOpenid: true })
          .limit(500)
          .get()
        : Promise.resolve({ data: [] }),
    ])

    const hiddenOpenids = new Set(
      (mySafetyRes.data || [])
        .filter((item) => item.isBlocked || item.isMuted)
        .map((item) => item.targetOpenid)
        .filter(Boolean)
    )
    const blockedByOpenids = new Set(
      (blockedByRes.data || [])
        .map((item) => item.ownerOpenid)
        .filter(Boolean)
    )

    const users = (usersRes.data || [])
      .filter((user) => {
        if (user.openid !== openid && hiddenOpenids.has(user.openid)) return false
        if (user.openid !== openid && blockedByOpenids.has(user.openid)) return false
        return true
      })
      .map((user) => ({
        _id: user._id,
        displayName: user.displayName,
        roles: normalizeRoles(user.roles),
        province: user.province,
        city: user.city,
        bio: user.bio,
        companionContext: user.companionContext || '',
        isSelf: user.openid === openid,
      }))

    return ok(requestId, { users, province: province || '', limit })
  } catch (err) {
    console.error('appService getMapUsers error:', err)
    return fail(requestId, 'GET_MAP_USERS_FAILED', '读取地图用户失败', { users: [], province: province || '' })
  }
}

module.exports = {
  getMapUsers,
}
