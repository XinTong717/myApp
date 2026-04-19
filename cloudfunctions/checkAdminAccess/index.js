const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const res = await db.collection('admin_users')
      .where({
        openid: OPENID,
        isActive: true,
      })
      .limit(1)
      .get()

    const admin = res.data[0] || null

    return {
      ok: true,
      isAdmin: !!admin,
      admin: admin ? {
        name: admin.name || '',
        role: admin.role || 'admin',
      } : null,
    }
  } catch (err) {
    console.error('checkAdminAccess error:', err)
    return {
      ok: false,
      isAdmin: false,
      message: '管理员权限检查失败，请确认 admin_users 集合已创建',
    }
  }
}
