const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeStringArray, normalizeRoles } = require('../lib/normalize')

function normalizeSection(value) {
  const section = String(value || 'all').trim()
  return ['pending', 'sent', 'accepted', 'all'].includes(section) ? section : 'all'
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

async function loadPending(openid, hiddenOpenidSet) {
  const pendingRes = await db.collection('connections')
    .where({ toOpenid: openid, status: 'pending' })
    .field({ _id: true, fromOpenid: true, fromUserId: true, fromName: true, fromCity: true, fromRoles: true, fromBio: true, createdAt: true })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return (pendingRes.data || [])
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
}

async function loadSent(openid, hiddenOpenidSet) {
  const sentRes = await db.collection('connections')
    .where({ fromOpenid: openid, status: 'pending' })
    .field({ _id: true, toOpenid: true, toUserId: true, toName: true, toCity: true, status: true, createdAt: true })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return (sentRes.data || [])
    .filter((item) => !hiddenOpenidSet.has(item.toOpenid))
    .map((item) => ({
      _id: item._id,
      toUserId: item.toUserId || '',
      toName: item.toName,
      toCity: item.toCity,
      status: item.status,
      createdAt: item.createdAt,
    }))
}

async function loadAccepted(openid, hiddenOpenidSet) {
  const [acceptedFrom, acceptedTo] = await Promise.all([
    db.collection('connections')
      .where({ fromOpenid: openid, status: 'accepted' })
      .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
      .limit(50)
      .get(),
    db.collection('connections')
      .where({ toOpenid: openid, status: 'accepted' })
      .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
      .limit(50)
      .get(),
  ])

  const allAccepted = [...(acceptedFrom.data || []), ...(acceptedTo.data || [])]
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

  return allAccepted.reduce((acc, conn) => {
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
}

async function getMyRequests(event, wxContext) {
  const requestId = resolveRequestId('get-my-requests', event)
  const section = normalizeSection(event?.section)

  try {
    const openid = wxContext.OPENID
    const hiddenOpenidSet = await loadHiddenOpenidSet(openid)
    const payload = { section }

    if (section === 'pending' || section === 'all') {
      payload.pending = await loadPending(openid, hiddenOpenidSet)
    }

    if (section === 'accepted' || section === 'all') {
      payload.accepted = await loadAccepted(openid, hiddenOpenidSet)
    }

    if (section === 'sent' || section === 'all') {
      payload.sent = await loadSent(openid, hiddenOpenidSet)
    }

    return ok(requestId, payload)
  } catch (err) {
    console.error('appService getMyRequests split error:', err)
    return fail(requestId, 'GET_MY_REQUESTS_FAILED', '读取联络动态失败', { pending: [], accepted: [], sent: [] })
  }
}

module.exports = {
  getMyRequests,
}
