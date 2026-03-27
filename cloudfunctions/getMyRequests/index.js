const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID

  try {
    // 1. 收到的待处理请求
    const pendingRes = await db.collection('connections')
      .where({ toOpenid: myOpenid, status: 'pending' })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    // 2. 已接受的联络（双向查询）
    const acceptedFrom = await db.collection('connections')
      .where({ fromOpenid: myOpenid, status: 'accepted' })
      .limit(50)
      .get()
    const acceptedTo = await db.collection('connections')
      .where({ toOpenid: myOpenid, status: 'accepted' })
      .limit(50)
      .get()

    const allAccepted = [...acceptedFrom.data, ...acceptedTo.data]

    // 3. 对已接受的联络，查对方的详细资料（含微信号和私密信息）
    const enrichedAccepted = []
    for (const conn of allAccepted) {
      const otherOpenid = conn.fromOpenid === myOpenid ? conn.toOpenid : conn.fromOpenid
      const otherBasicName = conn.fromOpenid === myOpenid ? conn.toName : conn.fromName

      const userRes = await db.collection('users')
        .where({ openid: otherOpenid })
        .field({
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
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return {
      ok: true,
      pending: pendingRes.data,
      accepted: enrichedAccepted,
      sent: sentRes.data,
    }
  } catch (err) {
    console.error('getMyRequests error:', err)
    return { ok: false, pending: [], accepted: [], sent: [], error: err.message }
  }
}
