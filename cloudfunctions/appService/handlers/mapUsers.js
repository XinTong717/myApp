const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles, normalizeStringArray } = require('../lib/normalize')

const $ = db.command.aggregate
const MAP_USERS_PROVINCE_LIMIT = 300
const MAP_USERS_SUMMARY_SCAN_LIMIT = 1000
const MAP_USERS_MAX_PAGE_LIMIT = 300

function normalizeProvince(value) {
  return String(value || '').trim()
}

function normalizeFilter(value) {
  return String(value || '').trim()
}

function normalizeOffset(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function normalizeLimit(value, fallback = MAP_USERS_PROVINCE_LIMIT) {
  const n = Number(value || fallback)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), MAP_USERS_MAX_PAGE_LIMIT)
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

function hasCompletedProfile(user) {
  return !!(user && user.displayName && user.province && user.city)
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

function toPublicUser(user, openid, requesterHasProfile) {
  const roles = normalizeRoles(user.roles)
  const expanded = requesterHasProfile || user.openid === openid
  const payload = {
    _id: user._id,
    displayName: user.displayName,
    roles,
    province: user.province,
    city: user.city,
    bio: user.bio,
    companionContext: user.companionContext || '',
    hasExpandedProfile: expanded,
    isSelf: user.openid === openid,
  }

  if (!expanded) return payload

  return {
    ...payload,
    contactId: String(user.contactId || user.wechatId || '').trim(),
    contactNote: String(user.contactNote || '').trim(),
    childAgeRange: roles.includes('家长') ? normalizeStringArray(user.childAgeRange) : [],
    childDropoutStatus: roles.includes('家长') ? normalizeStringArray(user.childDropoutStatus) : [],
    childInterests: roles.includes('家长') ? String(user.childInterests || '').trim() : '',
    eduServices: roles.includes('教育者') ? String(user.eduServices || '').trim() : '',
  }
}

async function loadRequesterProfile(openid) {
  if (!openid) return null
  try {
    const res = await db.collection('users')
      .where({ openid })
      .field({ displayName: true, province: true, city: true })
      .limit(1)
      .get()
    return (res.data || [])[0] || null
  } catch (err) {
    console.warn('load requester profile degraded:', err)
    return null
  }
}

async function getAggregateProvinceSummaries() {
  const res = await db.collection('users')
    .aggregate()
    .match({
      province: _.neq(''),
      city: _.neq(''),
      displayName: _.neq(''),
      isVisibleOnMap: _.neq(false),
    })
    .group({
      _id: '$province',
      count: $.sum(1),
    })
    .sort({ count: -1 })
    .limit(100)
    .end()

  return (res.list || [])
    .map((item) => ({ province: normalizeProvince(item._id), count: Number(item.count || 0) }))
    .filter((item) => item.province && item.count > 0)
}

async function getScannedProvinceSummaries({ openid, role, childAgeRange, mySafetyRes, blockedByRes }) {
  const { hiddenOpenids, blockedByOpenids } = buildHiddenSets(openid, mySafetyRes, blockedByRes)
  const usersRes = await db.collection('users')
    .where({
      province: _.neq(''),
      city: _.neq(''),
      displayName: _.neq(''),
      isVisibleOnMap: _.neq(false),
    })
    .field({ province: true, openid: true, roles: true, childAgeRange: true })
    .limit(MAP_USERS_SUMMARY_SCAN_LIMIT)
    .get()

  const provinceMap = new Map()
  ;(usersRes.data || []).forEach((user) => {
    if (!isVisibleToRequester(user, openid, hiddenOpenids, blockedByOpenids)) return
    if (!matchesRole(user, role)) return
    if (!matchesChildAgeRange(user, childAgeRange)) return

    const province = normalizeProvince(user.province)
    if (!province) return
    const current = provinceMap.get(province) || { province, count: 0 }
    current.count += 1
    provinceMap.set(province, current)
  })

  return Array.from(provinceMap.values()).sort((a, b) => b.count - a.count)
}

async function getProvinceSummaries({ openid, role, childAgeRange, mySafetyRes, blockedByRes }) {
  const { hiddenOpenids, blockedByOpenids } = buildHiddenSets(openid, mySafetyRes, blockedByRes)
  const hasPersonalSafetyFilters = hiddenOpenids.size > 0 || blockedByOpenids.size > 0
  const hasUserFilters = !!role || !!childAgeRange

  if (!hasPersonalSafetyFilters && !hasUserFilters) {
    try {
      return await getAggregateProvinceSummaries()
    } catch (err) {
      console.warn('getMapUsers aggregate summary failed, falling back to scan:', err && err.message ? err.message : err)
    }
  }

  return getScannedProvinceSummaries({ openid, role, childAgeRange, mySafetyRes, blockedByRes })
}

async function getMapUsers(event, wxContext) {
  const requestId = resolveRequestId('get-map-users', event)
  const openid = wxContext.OPENID
  const province = normalizeProvince(event.province)
  const role = normalizeFilter(event.role)
  const childAgeRange = normalizeFilter(event.childAgeRange)
  const offset = normalizeOffset(event.offset)
  const pageLimit = normalizeLimit(event.limit)

  try {
    const [mySafetyRes, blockedByRes, requesterProfile] = await Promise.all([
      ...await loadSafetyRelations(openid),
      loadRequesterProfile(openid),
    ])
    const requesterHasProfile = hasCompletedProfile(requesterProfile)

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
      .field({ displayName: true, roles: true, province: true, city: true, bio: true, companionContext: true, openid: true, contactId: true, contactNote: true, wechatId: true, childAgeRange: true, childDropoutStatus: true, childInterests: true, eduServices: true })
      .skip(offset)
      .limit(pageLimit + 1)
      .get()

    const { hiddenOpenids, blockedByOpenids } = buildHiddenSets(openid, mySafetyRes, blockedByRes)
    const rawUsers = usersRes.data || []
    const hasMore = rawUsers.length > pageLimit
    const pageUsers = rawUsers.slice(0, pageLimit)
      .filter((user) => isVisibleToRequester(user, openid, hiddenOpenids, blockedByOpenids))
      .filter((user) => matchesRole(user, role))
      .filter((user) => matchesChildAgeRange(user, childAgeRange))

    const users = pageUsers.map((user) => toPublicUser(user, openid, requesterHasProfile))

    return ok(requestId, {
      users,
      province,
      provinceStats: [],
      mode: 'province_detail',
      limit: pageLimit,
      offset,
      nextOffset: hasMore ? offset + pageLimit : null,
      hasMore,
    })
  } catch (err) {
    console.error('appService getMapUsers error:', err)
    return fail(requestId, 'GET_MAP_USERS_FAILED', '读取地图用户失败', { users: [], province: province || '', provinceStats: [] })
  }
}

module.exports = {
  getMapUsers,
}
