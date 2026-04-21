const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DAILY_SUBMISSION_LIMIT = 5

const ALLOWED_FIELDS = [
  'name',
  'province',
  'city',
  'communityType',
  'ageRange',
  'officialUrl',
  'participationNote',
  'feeNote',
  'sourceNote',
  'recommendationNote',
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
    console.error('submitCommunity msgSecCheck blocked content:', res)
    return { ok: false, message: '内容包含不合规信息，请修改后重试' }
  } catch (err) {
    console.error('submitCommunity msgSecCheck error:', err)
    return { ok: false, message: '内容审核失败，请稍后重试' }
  }
}

function buildNormalizedKey(name, province, city) {
  return [name, province, city]
    .map((item) => String(item || '').trim().toLowerCase())
    .join('::')
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const cleanData = { updatedAt: db.serverDate() }
  for (const key of ALLOWED_FIELDS) {
    if (event[key] !== undefined) {
      cleanData[key] = String(event[key] || '').trim()
    }
  }

  if (!cleanData.name) {
    return { ok: false, message: '请填写学习社区名称' }
  }
  if (!cleanData.province || !cleanData.city) {
    return { ok: false, message: '请选择所在城市' }
  }

  const securityResult = await runMsgSecCheck([
    cleanData.name,
    cleanData.communityType,
    cleanData.ageRange,
    cleanData.officialUrl,
    cleanData.participationNote,
    cleanData.feeNote,
    cleanData.sourceNote,
    cleanData.recommendationNote,
  ].filter(Boolean).join('\n'), OPENID)

  if (!securityResult.ok) {
    return securityResult
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('community_submissions')
    .where({
      openid: OPENID,
      createdAt: _.gte(since),
    })
    .count()

  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) {
    return { ok: false, message: '24小时内最多可提交5次推荐，请稍后再试' }
  }

  const normalizedKey = buildNormalizedKey(cleanData.name, cleanData.province, cleanData.city)

  const existing = await db.collection('community_submissions')
    .where({
      normalizedKey,
      status: _.in(['pending', 'approved', 'merged']),
    })
    .limit(1)
    .get()

  if (existing.data.length > 0) {
    return { ok: false, message: '这个学习社区已在审核队列或已收录，无需重复提交' }
  }

  const userRes = await db.collection('users')
    .where({ openid: OPENID })
    .field({ displayName: true, roles: true, city: true })
    .limit(1)
    .get()
  const submitter = userRes.data[0] || {}

  try {
    await db.collection('community_submissions').add({
      data: {
        openid: OPENID,
        submitterDisplayName: submitter.displayName || '',
        submitterRoles: submitter.roles || [],
        submitterCity: submitter.city || '',
        normalizedKey,
        name: cleanData.name,
        province: cleanData.province,
        city: cleanData.city,
        communityType: cleanData.communityType || '',
        ageRange: cleanData.ageRange || '',
        officialUrl: cleanData.officialUrl || '',
        participationNote: cleanData.participationNote || '',
        feeNote: cleanData.feeNote || '',
        sourceNote: cleanData.sourceNote || '',
        recommendationNote: cleanData.recommendationNote || '',
        status: 'pending',
        adminNote: '',
        reviewedAt: null,
        reviewedBy: '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return { ok: true, message: '提交成功，感谢推荐' }
  } catch (err) {
    console.error('submitCommunity error:', err)
    return { ok: false, message: '提交失败，请稍后重试' }
  }
}
