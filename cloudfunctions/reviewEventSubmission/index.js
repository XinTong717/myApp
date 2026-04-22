const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const ALLOWED_ACTIONS = ['mark_published', 'reject', 'reset_pending']

function createRequestId() {
  return `review-event-submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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
  const requestId = createRequestId()
  const { OPENID } = cloud.getWXContext()
  const submissionId = String(event.submissionId || '').trim()
  const action = String(event.action || '').trim()
  const publishedEventIdRaw = event.publishedEventId
  const adminNote = String(event.adminNote || '').trim()

  if (!submissionId) {
    return { ok: false, code: 'SUBMISSION_ID_REQUIRED', requestId, message: '缺少 submissionId' }
  }

  if (!ALLOWED_ACTIONS.includes(action)) {
    return { ok: false, code: 'INVALID_ACTION', requestId, message: '不支持的 action' }
  }

  try {
    const admin = await getActiveAdmin(OPENID)
    if (!admin) {
      return { ok: false, code: 'FORBIDDEN', requestId, message: '无权限修改活动审核状态' }
    }

    const docRes = await db.collection('event_submissions').doc(submissionId).get()
    const submission = docRes.data

    if (!submission) {
      return { ok: false, code: 'SUBMISSION_NOT_FOUND', requestId, message: '未找到该活动提交记录' }
    }

    const reviewerName = String(admin.name || '').trim() || 'admin'

    if (action === 'mark_published') {
      const publishedEventId = Number(publishedEventIdRaw || 0)
      if (!publishedEventId) {
        return { ok: false, code: 'PUBLISHED_EVENT_ID_REQUIRED', requestId, message: 'mark_published 需要有效的 publishedEventId' }
      }

      await db.collection('event_submissions').doc(submissionId).update({
        data: {
          status: 'merged',
          publishedEventId,
          publishedAt: db.serverDate(),
          reviewedAt: db.serverDate(),
          reviewedBy: reviewerName,
          adminNote: adminNote || '已发布到 events',
          updatedAt: db.serverDate(),
        },
      })

      return {
        ok: true,
        code: 'OK',
        requestId,
        message: '已标记为已发布',
        nextStatus: 'merged',
        publishedEventId,
      }
    }

    if (action === 'reject') {
      await db.collection('event_submissions').doc(submissionId).update({
        data: {
          status: 'rejected',
          reviewedAt: db.serverDate(),
          reviewedBy: reviewerName,
          adminNote: adminNote || '未通过审核',
          updatedAt: db.serverDate(),
        },
      })

      return {
        ok: true,
        code: 'OK',
        requestId,
        message: '已标记为拒绝',
        nextStatus: 'rejected',
      }
    }

    await db.collection('event_submissions').doc(submissionId).update({
      data: {
        status: 'pending',
        publishedEventId: db.command.remove(),
        publishedAt: db.command.remove(),
        reviewedAt: db.serverDate(),
        reviewedBy: reviewerName,
        adminNote: adminNote || '已重置为待审核',
        updatedAt: db.serverDate(),
      },
    })

    return {
      ok: true,
      code: 'OK',
      requestId,
      message: '已重置为待审核',
      nextStatus: 'pending',
    }
  } catch (err) {
    console.error('reviewEventSubmission error:', err)
    return { ok: false, code: 'REVIEW_EVENT_SUBMISSION_FAILED', requestId, message: '更新审核状态失败，请稍后重试' }
  }
}
