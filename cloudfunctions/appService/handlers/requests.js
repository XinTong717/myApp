const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeStringArray, normalizeRoles } = require('../lib/normalize')

const DEFAULT_PAGE_LIMIT = 50
const MAX_PAGE_LIMIT = 100

function normalizeSection(value) {
  const section = String(value || 'all').trim()
  return ['pending', 'sent', 'accepted', 'all'].includes(section) ? section : 'all'
}

function normalizeOffset(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function normalizeLimit(value) {
  const n = Number(value || DEFAULT_PAGE_LIMIT)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_LIMIT
  return Math.min(Math.floor(n), MAX_PAGE_LIMIT)
}

function toPageMeta(section, offset, limit, rawLength) {
  const hasMore = rawLength > limit
  return {
    section,
    offset,
    limit,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  }
}

async function loadHiddenOpenidSet(openid) {
  const safetyRes = await db.collection('safety_relations')
    .where({ ownerOpenid: openid })
    .field({ targetOpenid: true, isBlocked: true, isMuted: true })
    .limit(200)
    .get()

  return new Set(
    (safetyRes.data || [])
      .filter((item) => item.isBlocked || item.isMuted)
      .map((item) => item.targetOpenid)
      .filter(Boolean)
  )
}

async function loadPending(openid, hiddenOpenidSet, offset, limit) {
  const pendingRes = await db.collection('connections')
    .where({ toOpenid: openid, status: 'pending' })
    .field({ _id: true, fromOpenid: true, fromUserId: true, fromName: true, fromCity: true, fromRoles: true, fromBio: true, createdAt: true })
    .orderBy('createdAt', 'desc')
    .skip(offset)
    .limit(limit + 1)
    .get()

  const raw = pendingRes.data || []
  const items = raw.slice(0, limit)
    .filter((item) => !hiddenOpenidSet.has(item.fromOpenid))
    .map((item) => ({
      _id: item._id,
      fromUserId: item.fromUserId || '',
      fromName: item.fromName,
      fromCity: item.fromCity,
      fromRoles: normalizeRoles(item.fromRoles || []),
      fromBio: item.fromBio,
      createdAt: item.createdAt,
    }))

  return { items, page: toPageMeta('pending', offset, limit, raw.length) }
}

async function loadSent(openid, hiddenOpenidSet, offset, limit) {
  const sentRes = await db.collection('connections')
    .where({ fromOpenid: openid, status: 'pending' })
    .field({ _id: true, toOpenid: true, toUserId: true, toName: true, toCity: true, status: true, createdAt: true })
    .orderBy('createdAt', 'desc')
    .skip(offset)
    .limit(limit + 1)
    .get()

  const raw = sentRes.data || []
  const items = raw.slice(0, limit)
    .filter((item) => !hiddenOpenidSet.has(item.toOpenid))
    .map((item) => ({
      _id: item._id,
      toUserId: item.toUserId || '',
      toName: item.toName,
      toCity: item.toCity,
      status: item.status,
      createdAt: item.createdAt,
    }))

  return { items, page: toPageMeta('sent', offset, limit, raw.length) }
}

async function loadAccepted(openid, hiddenOpenidSet, offset, limit) {
  const perDirectionOffset = offset
  const perDirectionLimit = limit
  const [acceptedFrom, acceptedTo] = await Promise.all([
    db.collection('connections')
      .where({ fromOpenid: openid, status: 'accepted' })
      .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
      .orderBy('respondedAt', 'desc')
      .skip(perDirectionOffset)
      .limit(perDirectionLimit + 1)
      .get(),
    db.collection('connections')
      .where({ toOpenid: openid, status: 'accepted' })
      .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
      .orderBy('respondedAt', 'desc')
      .skip(perDirectionOffset)
      .limit(perDirectionLimit + 1)
      .get(),
  ])

  const rawFrom = acceptedFrom.data || []
  const rawTo = acceptedTo.data || []
  const pageFrom = rawFrom.slice(0, perDirectionLimit)
  const pageTo = rawTo.slice(0, perDirectionLimit)
  const allAccepted = [...pageFrom, ...pageTo]
    .sort((a, b) => new Date(b.respondedAt || 0).getTime() - new Date(a.respondedAt || 0).getTime())

  const otherOpenids = Array.from(new Set(
    allAccepted
      .map((conn) => (conn.fromOpenid === openid ? conn.toOpenid : conn.fromOpenid))
      .filter((oid) => oid && !hiddenOpenidSet.has(oid))
  ))

  const usersRes = otherOpenids.length > 0
    ? await db.collection('users')
      .where({ openid: _.in(otherOpenids) })
      .field({ _id: true, openid: true, displayName: true, city: true, roles: true, bio: true, wechatId: true, childAgeRange: true, childDropoutStatus: true, childInterests: true, eduServices: true })
      .limit(Math.min(otherOpenids.length, 100))
      .get()
    : { data: [] }

  const userMap = new Map((usersRes.data || []).map((user) => [user.openid, user]))

  const items = allAccepted.reduce((acc, conn) => {
    const otherOpenid = conn.fromOpenid === openid ? conn.toOpenid : conn.fromOpenid
    if (hiddenOpenidSet.has(otherOpenid)) return acc

    const otherUserId = conn.fromOpenid === openid ? conn.toUserId : conn.fromUserId
    const otherBasicName = conn.fromOpenid === openid ? conn.toName : conn.fromName
    const other = userMap.get(otherOpenid) || {}
    const otherRoles = normalizeRoles(other.roles || [])

    acc.push({
      _id: conn._id,
      otherUserId: other._id || otherUserId || '',
      otherName: other.displayName || otherBasicName,
      otherCity: other.city || '',
      otherRoles,
      otherBio: other.bio || '',
      otherWechat: other.wechatId || '',
      otherChildInfo: otherRoles.includes('家长')
        ? {
          ageRange: normalizeStringArray(other.childAgeRange),
          status: normalizeStringArray(other.childDropoutStatus),
          interests: other.childInterests || '',
        }
        : null,
      otherEduServices: otherRoles.includes('教育者') ? (other.eduServices || '') : '',
      respondedAt: conn.respondedAt,
    })

    return acc
  }, [])

  return {
    items,
    page: {
      section: 'accepted',
      offset,
      limit,
      hasMore: rawFrom.length > perDirectionLimit || rawTo.length > perDirectionLimit,
      nextOffset: rawFrom.length > perDirectionLimit || rawTo.length > perDirectionLimit ? offset + limit : null,
    },
  }
}

async function getMyRequests(event, wxContext) {
  const requestId = resolveRequestId('get-my-requests', event)
  const section = normalizeSection(event?.section)
  const offset = normalizeOffset(event?.offset)
  const limit = normalizeLimit(event?.limit)

  try {
    const openid = wxContext.OPENID
    const hiddenOpenidSet = await loadHiddenOpenidSet(openid)
    const payload = { section, offset, limit, pages: {} }

    if (section === 'pending' || section === 'all') {
      const result = await loadPending(openid, hiddenOpenidSet, section === 'all' ? 0 : offset, limit)
      payload.pending = result.items
      payload.pages.pending = result.page
    }

    if (section === 'accepted' || section === 'all') {
      const result = await loadAccepted(openid, hiddenOpenidSet, section === 'all' ? 0 : offset, limit)
      payload.accepted = result.items
      payload.pages.accepted = result.page
    }

    if (section === 'sent' || section === 'all') {
      const result = await loadSent(openid, hiddenOpenidSet, section === 'all' ? 0 : offset, limit)
      payload.sent = result.items
      payload.pages.sent = result.page
    }

    return ok(requestId, payload)
  } catch (err) {
    console.error('appService getMyRequests split error:', err)
    return fail(requestId, 'GET_MY_REQUESTS_FAILED', '读取联络动态失败', { pending: [], accepted: [], sent: [], pages: {} })
  }
}

module.exports = {
  getMyRequests,
}
