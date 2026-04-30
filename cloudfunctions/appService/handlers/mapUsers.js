const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles } = require('../lib/normalize')

const MAP_USERS_PROVINCE_LIMIT = 300
const MAP_USERS_SUMMARY_SCAN_LIMIT = 1000

function normalizeProvince(value) {
  return String(value || '').trim()
}

function normalizeFilter(value) {
  return String(value || '').trim()
}

function matchesRole(user, role) {
  if (!role || role === '全部') return true
  const roles = normalizeRoles(user.roles || [])
  return roles.includes(role)
}

function matchesChildAgeRange(user, childAgeRange) {
  if (!childAgeRange || childAgeRange === '全部') return true
  const ranges = Array.isArray(user.childAgeRange) ? user.childAgeRange : []
  return ranges.includes(childAgeRange)
}

function buildHiddenSets(openid, mySafetyRes, blockedByRes) {
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

  return { hiddenOpenids, blockedByOpenids }
}

function isVisibleToRequester(user, openid, hiddenOpenids, blockedByOpenids) {
  if (user.openid !== openid && hiddenOpenids.has(user.openid)) return false
  if (user.openid !== openid && blockedByOpenids.has(user.openid)) return false
  return true
}

async function loadSafetyRelations(openid) {
  return Promise.all([
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
}

function toPublicUser(user, openid) {
  return {
    _id: user._id,
    displayName: user.displayName,
    roles: normalizeRoles(user.roles),
    province: user.province,
    city: user.city,
    bio: user.bio,
    companionContext: user.companionContext || '',
    isSelf: user.openid === openid,
  }
}

async function getProvinceSummaries({ openid, role, childAgeRange, mySafetyRes, blockedByRes }) {
  const { hiddenOpenids, blockedByOpenids } = buildHiddenSets(openid, mySafetyRes, blockedByRes)
  const usersRes = await db.collection('users')
    .where({
      province: _.neq(''),
      city: _.neq(''),
      displayName: _.neq(''),
      isVisibleOnMap: _.neq(false),
    })
    .field({ province: true, city: true, openid: true, roles: true, childAgeRange: true })
    .limit(MAP_USERS_SUMMARY_SCAN_LIMIT)
    .get()

  const provinceMap = new Map()
  ;(usersRes.data || []).forEach((user) => {
    if (!isVisibleToRequester(user, openid, hiddenOpenids, blockedByOpenids)) return
    if (!matchesRole(user, role)) return
    if (!matchesChildAgeRange(user, childAgeRange)) return

    const province = normalizeProvince(user.province)
    if (!province) return
    const current = provinceMap.get(province) || { province, count: 0, sampleCities: [] }
    current.count += 1
    if (user.city && current.sampleCities.length < 5 && !current.sampleCities.includes(user.city)) {
      current.sampleCities.push(user.city)
    }
    provinceMap.set(province, current)
  })

  return Array.from(provinceMap.values()).sort((a, b) => b.count - a.count)
}

async function getMapUsers(event, wxContext) {
  const requestId = resolveRequestId('get-map-users', event)
  const openid = wxContext.OPENID
  const province = normalizeProvince(event.province)
  const role = normalizeFilter(event.role)
  const childAgeRange = normalizeFilter(event.childAgeRange)

  try {
    const [mySafetyRes, blockedByRes] = await loadSafetyRelations(openid)

    if (!province) {
      const provinceStats = await getProvinceSummaries({ openid, role, childAgeRange, mySafetyRes, blockedByRes })
      return ok(requestId, {
        users: [],
        provinceStats,
        province: '',
        mode: 'province_summary',
        limit: MAP_USERS_SUMMARY_SCAN_LIMIT,
      })
    }

    const usersRes = await db.collection('users')
      .where({
        province,
        city: _.neq(''),
        displayName: _.neq(''),
        isVisibleOnMap: _.neq(false),
      })
      .field({ displayName: true, roles: true, province: true, city: true, bio: true, companionContext: true, openid: true, childAgeRange: true })
      .limit(MAP_USERS_PROVINCE_LIMIT)
      .get()

    const { hiddenOpenids, blockedByOpenids } = buildHiddenSets(openid, mySafetyRes, blockedByRes)

    const users = (usersRes.data || [])
      .filter((user) => isVisibleToRequester(user, openid, hiddenOpenids, blockedByOpenids))
      .filter((user) => matchesRole(user, role))
      .filter((user) => matchesChildAgeRange(user, childAgeRange))
      .map((user) => toPublicUser(user, openid))

    return ok(requestId, { users, province, provinceStats: [], mode: 'province_detail', limit: MAP_USERS_PROVINCE_LIMIT })
  } catch (err) {
    console.error('appService getMapUsers error:', err)
    return fail(requestId, 'GET_MAP_USERS_FAILED', '读取地图用户失败', { users: [], province: province || '', provinceStats: [] })
  }
}

module.exports = {
  getMapUsers,
}
