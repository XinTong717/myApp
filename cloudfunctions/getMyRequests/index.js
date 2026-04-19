const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
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

    // 1. 收到的待处理请求
    const pendingRes = await db.collection('connections')
      .where({ toOpenid: myOpenid, status: 'pending' })
      .field({
        _id: true,
        fromOpenid: true,
        fromUserId: true,
        fromName: true,
        fromCity: true,
        fromRoles: true,
        fromBio: true,
        createdAt: true,
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const pending = (pendingRes.data || []).filter((item) => !hiddenOpenidSet.has(item.fromOpenid)).map((item) => ({
      _id: item._id,
      fromUserId: item.fromUserId || '',
      fromName: item.fromName,
      fromCity: item.fromCity,
      fromRoles: item.fromRoles,
      fromBio: item.fromBio,
      createdAt: item.createdAt,
    }))

    // 2. 已接受的联络（双向查询）
    const acceptedFrom = await db.collection('connections')
      .where({ fromOpenid: myOpenid, status: 'accepted' })
      .field({
        _id: true,
        fromOpenid: true,
        fromUserId: true,
        toOpenid: true,
        toUserId: true,
        fromName: true,
        toName: true,
        respondedAt: true,
      })
      .limit(50)
      .get()
    const acceptedTo = await db.collection('connections')
      .where({ toOpenid: myOpenid, status: 'accepted' })
      .field({
        _id: true,
        fromOpenid: true,
        fromUserId: true,
        toOpenid: true,
        toUserId: true,
        fromName: true,
        toName: true,
        respondedAt: true,
      })
      .limit(50)
      .get()

    const allAccepted = [...acceptedFrom.data, ...acceptedTo.data]

    // 3. 对已接受的联络，查对方的详细资料（含微信号和私密信息）
    const enrichedAccepted = []
    for (const conn of allAccepted) {
      const otherOpenid = conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid
      if (hiddenOpenidSet.has(otherOpenid)) continue

      const otherUserId = conn.fromOpenid === myOpenid ? conn.toUserId : conn.fromUserId
      const otherBasicName = conn.fromOpenid === myOpenid ? conn.toName : conn.fromName

      const userRes = await db.collection('users')
        .where({ openid: otherOpenid })
        .field({
          _id: true,
          displayName: true,
          city: true,
          roles: true,
          bio: true,
          wechatId: true,
          childAgeRange: true,
          childDropoutStatus: true,
          childInterests: true,
          eduServices: true,
        })
        .limit(1)
        .get()

      const other = userRes.data[0] || {}
      enrichedAccepted.push({
        _id: conn._id,
        otherUserId: other._id || otherUserId || '',
        otherName: other.displayName || otherBasicName,
        otherCity: other.city || '',
        otherRoles: other.roles || [],
        otherBio: other.bio || '',
        otherWechat: other.wechatId || '',
        otherChildInfo: (other.roles || []).includes('家长') ? {
          ageRange: other.childAgeRange || '',
          status: other.childDropoutStatus || '',
          interests: other.childInterests || '',
        } : null,
        otherEduServices: (other.roles || []).includes('教育者') ? (other.eduServices || '') : '',
        respondedAt: conn.respondedAt,
      })
    }

    // 4. 我发出的待处理请求
    const sentRes = await db.collection('connections')
      .where({ fromOpenid: myOpenid, status: 'pending' })
      .field({
        _id: true,
        toOpenid: true,
        toUserId: true,
        toName: true,
        toCity: true,
        status: true,
        createdAt: true,
      })
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

    return {
      ok: true,
      pending,
      accepted: enrichedAccepted,
      sent,
    }
  } catch (err) {
    console.error('getMyRequests error:', err)
    return { ok: false, pending: [], accepted: [], sent: [], error: err.message }
  }
}
