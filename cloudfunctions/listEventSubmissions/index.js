const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function getActiveAdmin(openid) {
  const res = await db.collection('admin_users')
    .where({
      openid,
      isActive: true,
    })
    .limit(1)
    .get()

  return res.data[0] || null
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const status = String(event.status || 'pending').trim()
  const limit = Math.min(Math.max(Number(event.limit || 30), 1), 100)

  try {
    const admin = await getActiveAdmin(OPENID)
    if (!admin) {
      return { ok: false, message: '无权限访问管理员审核列表' }
    }

    let query = db.collection('event_submissions')
    if (status && status !== 'all') {
      query = query.where({ status })
    }

    const res = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const submissions = (res.data || []).map((item) => ({
      _id: item._id,
      status: item.status || 'pending',
      title: item.title || '',
      province: item.province || '',
      city: item.city || '',
      eventType: item.eventType || '',
      organizer: item.organizer || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      isOnline: !!item.isOnline,
      fee: item.fee || '',
      officialUrl: item.officialUrl || '',
      submitterDisplayName: item.submitterDisplayName || '',
      submitterCity: item.submitterCity || '',
      createdAt: item.createdAt || null,
      publishedEventId: item.publishedEventId || null,
      adminNote: item.adminNote || '',
    }))

    return {
      ok: true,
      submissions,
      admin: {
        name: admin.name || '',
        role: admin.role || 'admin',
      },
    }
  } catch (err) {
    console.error('listEventSubmissions error:', err)
    return { ok: false, message: '读取活动审核列表失败，请确认 admin_users / event_submissions 配置正常' }
  }
}
