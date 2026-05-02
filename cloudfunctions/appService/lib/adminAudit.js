const { db } = require('./cloud')

class AdminAuditWriteError extends Error {
  constructor(cause) {
    super('ADMIN_AUDIT_WRITE_FAILED')
    this.name = 'AdminAuditWriteError'
    this.code = 'ADMIN_AUDIT_WRITE_FAILED'
    this.cause = cause
  }
}

async function writeAdminAuditLog({ admin, openid, action, targetType = '', targetId = '', metadata = {} }) {
  try {
    return await db.collection('admin_audit_logs').add({
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
    console.error('admin audit log write failed:', err)
    throw new AdminAuditWriteError(err)
  }
}

module.exports = { writeAdminAuditLog, AdminAuditWriteError }
