const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DAILY_SUBMISSION_LIMIT = 5

const ALLOWED_FIELDS = [
  'title',
  'province',
  'city',
  'eventTypes',
  'eventTypeOther',
  'audienceWho',
  'audienceWhoOther',
  'minAgeRequirement',
  'startTime',
  'endTime',
  'isOnline',
  'location',
  'fee',
  'feeDetail',
  'organizer',
  'organizerContact',
  'officialUrl',
  'signupNote',
  'description',
]

const ARRAY_FIELDS = ['eventTypes', 'audienceWho']

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const text = String(value || '').trim()
  if (!text) return []
  return text.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
}

function mergeOtherOption(values, otherText) {
  const filtered = values.filter((item) => item !== '其他')
  const text = String(otherText || '').trim()
  if (text) filtered.push(`其他：${text}`)
  return filtered
}

function stringifyLabels(values) {
  return values.filter(Boolean).join(' / ')
}

function pickPrimaryEventType(values) {
  if (!Array.isArray(values) || values.length === 0) return ''
  const known = values.find((item) => !String(item).startsWith('其他：'))
  return known || values[0]
}

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
      } else if (ARRAY_FIELDS.includes(key)) {
        cleanData[key] = normalizeStringArray(event[key])
      } else {
        cleanData[key] = String(event[key] || '').trim()
      }
    }
  }

  cleanData.eventTypes = mergeOtherOption(cleanData.eventTypes || [], cleanData.eventTypeOther)
  cleanData.audienceWho = mergeOtherOption(cleanData.audienceWho || [], cleanData.audienceWhoOther)
  cleanData.eventType = pickPrimaryEventType(cleanData.eventTypes)

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
    return { ok: false, message: '请填写组织者' }
  }
  if (!cleanData.fee) {
    return { ok: false, message: '请填写费用信息' }
  }
  if (cleanData.officialUrl && !/^https?:\/\//i.test(cleanData.officialUrl)) {
    return { ok: false, message: '公开主页或报名链接需以 http:// 或 https:// 开头' }
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

  const securityResult = await runMsgSecCheck([
    cleanData.title,
    stringifyLabels(cleanData.eventTypes || []),
    stringifyLabels(cleanData.audienceWho || []),
    cleanData.minAgeRequirement,
    cleanData.location,
    cleanData.fee,
    cleanData.feeDetail,
    cleanData.organizer,
    cleanData.organizerContact,
    cleanData.officialUrl,
    cleanData.signupNote,
    cleanData.description,
  ].filter(Boolean).join('\n'), OPENID)

  if (!securityResult.ok) {
    return securityResult
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
        eventTypes: cleanData.eventTypes || [],
        audienceWho: stringifyLabels(cleanData.audienceWho || []),
        audienceWhoTags: cleanData.audienceWho || [],
        minAgeRequirement: cleanData.minAgeRequirement || '',
        startTime: cleanData.startTime,
        endTime: cleanData.endTime || '',
        isOnline: !!cleanData.isOnline,
        location: cleanData.location || '',
        fee: cleanData.fee || '',
        feeDetail: cleanData.feeDetail || '',
        organizer: cleanData.organizer || '',
        organizerContact: cleanData.organizerContact || '',
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
