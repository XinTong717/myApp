const { db } = require('./cloud')

async function writeAdminAuditLog({ admin, openid, action, targetType = '', targetId = '', metadata = {} }) {
  try {
    await db.collection('admin_audit_logs').add({
      data: {
        adminOpenid: openid || '',
        adminName: admin?.name || '',
        adminRole: admin?.role || 'admin',
        action,
        targetType,
        targetId,
        metadata,
        createdAt: db.serverDate(),
      },
    })
  } catch (err) {
    console.warn('admin audit log skipped:', err)
  }
}

module.exports = { writeAdminAuditLog }
