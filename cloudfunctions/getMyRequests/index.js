const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function normalizeRoles(roles = []) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => String(role).trim())
    .filter(Boolean)
    .map((role) => role === '其他' ? '同行者' : role)
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const text = String(value || '').trim()
  if (!text) return []
  return text.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
}

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID

  try {
    const safetyRes = await db.collection('safety_relations')
      .where({ ownerOpenid: myOpenid })
      .field({ targetOpenid: true, isBlocked: true, isMuted: true })
      .limit(200)
      .get()

    const hiddenOpenidSet = new Set(
      (safetyRes.data || [])
        .filter((item) => item.isBlocked || item.isMuted)
        .map((item) => item.targetOpenid)
        .filter(Boolean)
    )

    const pendingRes = await db.collection('connections')
      .where({ toOpenid: myOpenid, status: 'pending' })
      .field({ _id: true, fromOpenid: true, fromUserId: true, fromName: true, fromCity: true, fromRoles: true, fromBio: true, createdAt: true })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const pending = (pendingRes.data || []).filter((item) => !hiddenOpenidSet.has(item.fromOpenid)).map((item) => ({
      _id: item._id,
      fromUserId: item.fromUserId || '',
      fromName: item.fromName,
      fromCity: item.fromCity,
      fromRoles: normalizeRoles(item.fromRoles || []),
      fromBio: item.fromBio,
      createdAt: item.createdAt,
    }))

    const [acceptedFrom, acceptedTo] = await Promise.all([
      db.collection('connections')
        .where({ fromOpenid: myOpenid, status: 'accepted' })
        .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
        .limit(50)
        .get(),
      db.collection('connections')
        .where({ toOpenid: myOpenid, status: 'accepted' })
        .field({ _id: true, fromOpenid: true, fromUserId: true, toOpenid: true, toUserId: true, fromName: true, toName: true, respondedAt: true })
        .limit(50)
        .get(),
    ])

    const allAccepted = [...acceptedFrom.data, ...acceptedTo.data]
    const otherOpenids = Array.from(new Set(allAccepted
      .map((conn) => (conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid))
      .filter((openid) => openid && !hiddenOpenidSet.has(openid))))

    const usersRes = otherOpenids.length > 0
      ? await db.collection('users')
        .where({ openid: _.in(otherOpenids) })
        .field({ _id: true, openid: true, displayName: true, city: true, roles: true, bio: true, wechatId: true, childAgeRange: true, childDropoutStatus: true, childInterests: true, eduServices: true })
        .limit(Math.min(otherOpenids.length, 100))
        .get()
      : { data: [] }

    const userMap = new Map((usersRes.data || []).map((user) => [user.openid, user]))

    const enrichedAccepted = allAccepted.reduce((acc, conn) => {
      const otherOpenid = conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid
      if (hiddenOpenidSet.has(otherOpenid)) return acc

      const otherUserId = conn.fromOpenid === myOpenid ? conn.toUserId : conn.fromUserId
      const otherBasicName = conn.fromOpenid === myOpenid ? conn.toName : conn.fromName
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
        otherChildInfo: otherRoles.includes('家长') ? {
          ageRange: normalizeStringArray(other.childAgeRange),
          status: normalizeStringArray(other.childDropoutStatus),
          interests: other.childInterests || '',
        } : null,
        otherEduServices: otherRoles.includes('教育者') ? (other.eduServices || '') : '',
        respondedAt: conn.respondedAt,
      })
      return acc
    }, [])

    const sentRes = await db.collection('connections')
      .where({ fromOpenid: myOpenid, status: 'pending' })
      .field({ _id: true, toOpenid: true, toUserId: true, toName: true, toCity: true, status: true, createdAt: true })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const sent = (sentRes.data || []).filter((item) => !hiddenOpenidSet.has(item.toOpenid)).map((item) => ({
      _id: item._id,
      toUserId: item.toUserId || '',
      toName: item.toName,
      toCity: item.toCity,
      status: item.status,
      createdAt: item.createdAt,
    }))

    return { ok: true, pending, accepted: enrichedAccepted, sent }
  } catch (err) {
    console.error('getMyRequests error:', err)
    return { ok: false, pending: [], accepted: [], sent: [], error: err.message }
  }
}
