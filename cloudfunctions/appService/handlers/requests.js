const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { normalizeRoles } = require('../lib/normalize')
const legacyUserHandlers = require('./userV2')

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

async function getMyRequests(event, wxContext) {
  const requestId = resolveRequestId('get-my-requests', event)
  const section = normalizeSection(event?.section)

  if (section === 'accepted' || section === 'all') {
    return legacyUserHandlers.getMyRequests(event, wxContext)
  }

  try {
    const openid = wxContext.OPENID
    const hiddenOpenidSet = await loadHiddenOpenidSet(openid)

    if (section === 'pending') {
      return ok(requestId, { section, pending: await loadPending(openid, hiddenOpenidSet) })
    }

    if (section === 'sent') {
      return ok(requestId, { section, sent: await loadSent(openid, hiddenOpenidSet) })
    }

    return ok(requestId, { section, pending: [] })
  } catch (err) {
    console.error('appService getMyRequests split error:', err)
    return fail(requestId, 'GET_MY_REQUESTS_FAILED', '读取联络动态失败', { pending: [], accepted: [], sent: [] })
  }
}

module.exports = {
  getMyRequests,
}
