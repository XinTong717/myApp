const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DAILY_SUBMISSION_LIMIT = 5

const ALLOWED_FIELDS = [
  'title',
  'province',
  'city',
  'eventType',
  'audience',
  'startTime',
  'endTime',
  'isOnline',
  'location',
  'fee',
  'organizer',
  'officialUrl',
  'signupNote',
  'description',
]

async function runMsgSecCheck(content, openid) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return { ok: true }
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: normalized.slice(0, 2500),
      version: 2,
      scene: 2,
      openid,
    })
    const errCode = res?.errCode ?? res?.errcode ?? 0
    if (errCode === 0) {
      return { ok: true }
    }
    console.error('submitEvent msgSecCheck blocked content:', res)
    return { ok: false, message: '内容包含不合规信息，请修改后重试' }
  } catch (err) {
    console.error('submitEvent msgSecCheck error:', err)
    return { ok: false, message: '内容审核失败，请稍后重试' }
  }
}

function buildNormalizedKey(title, province, city, startTime) {
  return [title, province, city, startTime]
    .map((item) => String(item || '').trim().toLowerCase())
    .join('::')
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const cleanData = { updatedAt: db.serverDate() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      if (key === 'isOnline') {
        cleanData[key] = !!event[key]
      } else {
        cleanData[key] = String(event[key] || '').trim()
      }
    }
  }

  if (!cleanData.title) {
    return { ok: false, message: '请填写活动标题' }
  }
  if (!cleanData.province || !cleanData.city) {
    return { ok: false, message: '请选择所在城市' }
  }
  if (!cleanData.startTime) {
    return { ok: false, message: '请填写开始时间' }
  }
  if (!cleanData.description) {
    return { ok: false, message: '请填写活动简介' }
  }
  if (!cleanData.organizer) {
    return { ok: false, message: '请填写主办方' }
  }
  if (cleanData.officialUrl && !/^https?:\/\//i.test(cleanData.officialUrl)) {
    return { ok: false, message: '公开链接需以 http:// 或 https:// 开头' }
  }

  const startDate = new Date(cleanData.startTime)
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, message: '开始时间格式不正确' }
  }
  if (cleanData.endTime) {
    const endDate = new Date(cleanData.endTime)
    if (Number.isNaN(endDate.getTime())) {
      return { ok: false, message: '结束时间格式不正确' }
    }
    if (endDate.getTime() < startDate.getTime()) {
      return { ok: false, message: '结束时间不能早于开始时间' }
    }
  }

  const securityResult = await runMsgSecCheck([
    cleanData.title,
    cleanData.eventType,
    cleanData.audience,
    cleanData.location,
    cleanData.fee,
    cleanData.organizer,
    cleanData.signupNote,
    cleanData.description,
  ].filter(Boolean).join('\n'), OPENID)

  if (!securityResult.ok) {
    return securityResult
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('event_submissions')
    .where({
      openid: OPENID,
      createdAt: _.gte(since),
    })
    .count()

  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) {
    return { ok: false, message: '24小时内最多可提交5次活动，请稍后再试' }
  }

  const normalizedKey = buildNormalizedKey(cleanData.title, cleanData.province, cleanData.city, cleanData.startTime)

  const existing = await db.collection('event_submissions')
    .where({
      normalizedKey,
      status: _.in(['pending', 'approved', 'merged']),
    })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    return { ok: false, message: '这个活动已在审核队列或已收录，无需重复提交' }
  }

  const userRes = await db.collection('users')
    .where({ openid: OPENID })
    .field({ displayName: true, roles: true, city: true })
    .limit(1)
    .get()
  const submitter = userRes.data[0] || {}

  try {
    await db.collection('event_submissions').add({
      data: {
        openid: OPENID,
        submitterDisplayName: submitter.displayName || '',
        submitterRoles: submitter.roles || [],
        submitterCity: submitter.city || '',
        normalizedKey,
        title: cleanData.title,
        province: cleanData.province,
        city: cleanData.city,
        eventType: cleanData.eventType || '',
        audience: cleanData.audience || '',
        startTime: cleanData.startTime,
        endTime: cleanData.endTime || '',
        isOnline: !!cleanData.isOnline,
        location: cleanData.location || '',
        fee: cleanData.fee || '',
        organizer: cleanData.organizer || '',
        officialUrl: cleanData.officialUrl || '',
        signupNote: cleanData.signupNote || '',
        description: cleanData.description || '',
        status: 'pending',
        adminNote: '',
        reviewedAt: null,
        reviewedBy: '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, message: '提交成功，已进入审核队列' }
  } catch (err) {
    console.error('submitEvent error:', err)
    return { ok: false, message: '提交失败，请稍后重试' }
  }
}
