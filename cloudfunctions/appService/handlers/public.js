const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { runMsgSecCheck } = require('../lib/security')
const { API_BASE_URL, API_KEY, requestJson } = require('../lib/memfire')
const {
  normalizeStringArray,
  mergeOtherOption,
  stringifyLabels,
  validateLength,
} = require('../lib/normalize')
const { getUserProfileByOpenid } = require('../lib/userRepo')

const COUNT_COLLECTION = 'event_interest_counts'
const DAILY_SUBMISSION_LIMIT = 5
const SCHOOL_LIST_LIMIT = 200
const EVENT_LIST_LIMIT = 50

const SCHOOL_LIST_FIELDS = ['id', 'name', 'province', 'city', 'age_range', 'school_type'].join(',')
const SCHOOL_DETAIL_FIELDS = ['id', 'name', 'province', 'city', 'age_range', 'school_type', 'has_xuji', 'xuji_note', 'residency_req', 'admission_req', 'fee', 'output_direction', 'official_url'].join(',')
const EVENT_LIST_FIELDS = ['id', 'title', 'event_type', 'description', 'start_time', 'end_time', 'location', 'fee', 'status', 'organizer', 'is_online'].join(',')
const EVENT_DETAIL_FIELDS = EVENT_LIST_FIELDS

function buildInterestDocId(eventId, openid) {
  return `event_${eventId}_${openid}`
}

function buildCountDocId(eventId) {
  return String(eventId)
}

function toUpstreamFailure(requestId, err, emptyField, fallbackValue) {
  const isTimeout = err?.code === 'UPSTREAM_TIMEOUT'
  return fail(
    requestId,
    isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
    isTimeout ? '加载超时，请重试' : '暂时无法加载，请稍后重试',
    { [emptyField]: fallbackValue, stale: true }
  )
}

async function syncInterestCount(eventId) {
  const countRes = await db.collection('event_interest').where({ eventId, status: 'interested' }).count()
  const count = countRes.total || 0
  await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).set({
    data: { eventId, count, updatedAt: db.serverDate() },
  })
  return count
}

async function getCachedCount(eventId) {
  try {
    const cacheRes = await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).get()
    return Number(cacheRes.data?.count || 0)
  } catch (err) {
    return null
  }
}

async function getCachedCounts(eventIds) {
  const counts = {}
  const countDocIds = eventIds.map((eventId) => buildCountDocId(eventId))
  if (countDocIds.length === 0) return counts
  const cachedRes = await db.collection(COUNT_COLLECTION).where({ _id: _.in(countDocIds) }).get()
  const cacheMap = new Map((cachedRes.data || []).map((item) => [String(item._id), Number(item.count || 0)]))
  for (const eventId of eventIds) {
    const cacheKey = buildCountDocId(eventId)
    counts[eventId] = cacheMap.has(cacheKey) ? (cacheMap.get(cacheKey) || 0) : 0
  }
  return counts
}

async function updateInterestCountAfterMutation(eventId, delta) {
  const countDocId = buildCountDocId(eventId)
  try {
    await db.collection(COUNT_COLLECTION).doc(countDocId).update({
      data: { count: _.inc(delta), updatedAt: db.serverDate() },
    })
  } catch (err) {
    await db.collection(COUNT_COLLECTION).doc(countDocId).set({
      data: { eventId, count: Math.max(0, delta), updatedAt: db.serverDate() },
    })
  }
}

async function getSchools(event) {
  const requestId = resolveRequestId('get-schools', event)
  try {
    if (!API_KEY) return fail(requestId, 'MEMFIRE_API_KEY_MISSING', 'MEMFIRE_API_KEY 未配置', { schools: [] })
    const limit = Math.min(Math.max(Number(event?.limit || SCHOOL_LIST_LIMIT), 1), SCHOOL_LIST_LIMIT)
    const url = `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_LIST_FIELDS)}&order=id.asc&limit=${limit}`
    const data = await requestJson(url)
    return ok(requestId, { schools: Array.isArray(data) ? data : [] })
  } catch (err) {
    console.error('appService getSchools error:', err)
    return toUpstreamFailure(requestId, err, 'schools', [])
  }
}

async function getSchoolDetail(event) {
  const requestId = resolveRequestId('get-school-detail', event)
  try {
    if (!API_KEY) return fail(requestId, 'MEMFIRE_API_KEY_MISSING', 'MEMFIRE_API_KEY 未配置', { school: null })
    const schoolId = Number(event?.schoolId || 0)
    if (!schoolId) return fail(requestId, 'BAD_REQUEST', 'schoolId 无效', { school: null })
    const url = `${API_BASE_URL}/schools?select=${encodeURIComponent(SCHOOL_DETAIL_FIELDS)}&id=eq.${schoolId}&limit=1`
    const data = await requestJson(url)
    return ok(requestId, { school: Array.isArray(data) ? (data[0] || null) : null })
  } catch (err) {
    console.error('appService getSchoolDetail error:', err)
    return toUpstreamFailure(requestId, err, 'school', null)
  }
}

async function getEvents(event) {
  const requestId = resolveRequestId('get-events', event)
  try {
    if (!API_KEY) return fail(requestId, 'MEMFIRE_API_KEY_MISSING', 'MEMFIRE_API_KEY 未配置', { events: [] })
    const limit = Math.min(Math.max(Number(event?.limit || EVENT_LIST_LIMIT), 1), EVENT_LIST_LIMIT)
    const url = `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_LIST_FIELDS)}&order=start_time.asc&limit=${limit}`
    const data = await requestJson(url)
    const events = Array.isArray(data) ? data : []
    if (event?.includeInterestCounts === false || events.length === 0) {
      return ok(requestId, { events })
    }
    const eventIds = events.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0)
    const counts = await getCachedCounts(eventIds)
    return ok(requestId, {
      events: events.map((item) => ({
        ...item,
        interest_count: counts[Number(item.id)] || 0,
      })),
    })
  } catch (err) {
    console.error('appService getEvents error:', err)
    return toUpstreamFailure(requestId, err, 'events', [])
  }
}

async function getEventDetail(event) {
  const requestId = resolveRequestId('get-event-detail', event)
  try {
    if (!API_KEY) return fail(requestId, 'MEMFIRE_API_KEY_MISSING', 'MEMFIRE_API_KEY 未配置', { event: null })
    const eventId = Number(event?.eventId || 0)
    if (!eventId) return fail(requestId, 'BAD_REQUEST', 'eventId 无效', { event: null })
    const url = `${API_BASE_URL}/events?select=${encodeURIComponent(EVENT_DETAIL_FIELDS)}&id=eq.${eventId}&limit=1`
    const data = await requestJson(url)
    return ok(requestId, { event: Array.isArray(data) ? (data[0] || null) : null })
  } catch (err) {
    console.error('appService getEventDetail error:', err)
    return toUpstreamFailure(requestId, err, 'event', null)
  }
}

async function submitCorrection(event, wxContext) {
  const requestId = resolveRequestId('submit-correction', event)
  const openid = wxContext.OPENID
  const schoolId = Number(event.schoolId || 0)
  const schoolName = String(event.schoolName || '').trim()
  const content = String(event.content || '').trim()
  if (!content) return fail(requestId, 'CONTENT_REQUIRED', '内容不能为空')
  if (!schoolId) return fail(requestId, 'BAD_REQUEST', '缺少学习社区信息')
  const sec = await runMsgSecCheck({ content, openid, scene: 2, blockedMessage: '内容包含不合规信息，请修改后重试', failedMessage: '内容审核失败，请稍后重试' })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  try {
    await db.collection('corrections').add({
      data: { openid, schoolId, schoolName, content, status: 'pending', createdAt: db.serverDate() },
    })
    return ok(requestId, { message: '提交成功' })
  } catch (err) {
    console.error('appService submitCorrection error:', err)
    return fail(requestId, 'SUBMIT_CORRECTION_FAILED', '提交失败，请稍后重试')
  }
}

async function submitCommunity(event, wxContext) {
  const requestId = resolveRequestId('submit-community', event)
  const openid = wxContext.OPENID
  const cleanData = { updatedAt: db.serverDate() }
  const allowed = ['name', 'province', 'city', 'communityType', 'communityTypeOther', 'ageRange', 'ageRangeOther', 'officialUrl', 'participationNote', 'feeNote', 'sourceNote', 'recommendationNote']
  for (const key of allowed) {
    if (event[key] !== undefined) cleanData[key] = ['communityType', 'ageRange'].includes(key) ? normalizeStringArray(event[key]) : String(event[key] || '').trim()
  }
  cleanData.communityType = mergeOtherOption(cleanData.communityType || [], cleanData.communityTypeOther)
  cleanData.ageRange = mergeOtherOption(cleanData.ageRange || [], cleanData.ageRangeOther)
  if (!cleanData.name) return fail(requestId, 'NAME_REQUIRED', '请填写学习社区名称')
  if (!cleanData.province || !cleanData.city) return fail(requestId, 'CITY_REQUIRED', '请选择所在城市')
  const lengthError =
    validateLength('学习社区名称', cleanData.name, 100) ||
    validateLength('城市', cleanData.city, 30) ||
    validateLength('公开主页', cleanData.officialUrl, 300) ||
    validateLength('参与说明', cleanData.participationNote, 300) ||
    validateLength('费用说明', cleanData.feeNote, 200) ||
    validateLength('信息来源', cleanData.sourceNote, 300) ||
    validateLength('推荐理由', cleanData.recommendationNote, 1000)
  if (lengthError) return fail(requestId, 'INVALID_LENGTH', lengthError)
  if (cleanData.officialUrl && !/^https?:\/\//i.test(cleanData.officialUrl)) return fail(requestId, 'INVALID_OFFICIAL_URL', '公开主页需以 http:// 或 https:// 开头')
  const sec = await runMsgSecCheck({ content: [cleanData.name, stringifyLabels(cleanData.communityType || []), stringifyLabels(cleanData.ageRange || []), cleanData.officialUrl, cleanData.participationNote, cleanData.feeNote, cleanData.sourceNote, cleanData.recommendationNote].filter(Boolean).join('\n'), openid, scene: 2 })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('community_submissions').where({ openid, createdAt: _.gte(since) }).count()
  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) return fail(requestId, 'DAILY_LIMIT_REACHED', '24小时内最多可提交5次推荐，请稍后再试')
  const normalizedKey = [cleanData.name, cleanData.province, cleanData.city].map((item) => String(item || '').trim().toLowerCase()).join('::')
  const existing = await db.collection('community_submissions').where({ normalizedKey, status: _.in(['pending', 'approved', 'merged']) }).limit(1).get()
  if (existing.data.length > 0) return fail(requestId, 'DUPLICATE_SUBMISSION', '这个学习社区已在审核队列或已收录，无需重复提交')
  const submitter = await getUserProfileByOpenid(openid, ['displayName', 'roles', 'city']) || {}
  try {
    await db.collection('community_submissions').add({
      data: {
        openid,
        submitterDisplayName: submitter.displayName || '',
        submitterRoles: submitter.roles || [],
        submitterCity: submitter.city || '',
        normalizedKey,
        name: cleanData.name,
        province: cleanData.province,
        city: cleanData.city,
        communityType: stringifyLabels(cleanData.communityType || []),
        communityTypes: cleanData.communityType || [],
        ageRange: stringifyLabels(cleanData.ageRange || []),
        ageRanges: cleanData.ageRange || [],
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
    return ok(requestId, { message: '提交成功，感谢推荐' })
  } catch (err) {
    console.error('appService submitCommunity error:', err)
    return fail(requestId, 'SUBMIT_COMMUNITY_FAILED', '提交失败，请稍后重试')
  }
}

async function submitEvent(event, wxContext) {
  const requestId = resolveRequestId('submit-event', event)
  const openid = wxContext.OPENID
  const allowed = ['title', 'province', 'city', 'eventTypes', 'eventTypeOther', 'audienceWho', 'audienceWhoOther', 'minAgeRequirement', 'startTime', 'endTime', 'isOnline', 'location', 'fee', 'feeDetail', 'organizer', 'organizerContact', 'officialUrl', 'signupNote', 'description']
  const cleanData = { updatedAt: db.serverDate() }
  for (const key of allowed) {
    if (event[key] !== undefined) {
      if (key === 'isOnline') cleanData[key] = !!event[key]
      else if (['eventTypes', 'audienceWho'].includes(key)) cleanData[key] = normalizeStringArray(event[key])
      else cleanData[key] = String(event[key] || '').trim()
    }
  }
  cleanData.eventTypes = mergeOtherOption(cleanData.eventTypes || [], cleanData.eventTypeOther)
  cleanData.audienceWho = mergeOtherOption(cleanData.audienceWho || [], cleanData.audienceWhoOther)
  cleanData.eventType = (cleanData.eventTypes || []).find((item) => !String(item).startsWith('其他：')) || (cleanData.eventTypes || [])[0] || ''
  if (!cleanData.title) return fail(requestId, 'TITLE_REQUIRED', '请填写活动标题')
  if (!cleanData.province || !cleanData.city) return fail(requestId, 'CITY_REQUIRED', '请选择所在城市')
  if (!cleanData.startTime) return fail(requestId, 'START_TIME_REQUIRED', '请填写开始时间')
  if (!cleanData.description) return fail(requestId, 'DESCRIPTION_REQUIRED', '请填写活动简介')
  if (!cleanData.organizer) return fail(requestId, 'ORGANIZER_REQUIRED', '请填写组织者')
  if (!cleanData.fee) return fail(requestId, 'FEE_REQUIRED', '请填写费用信息')
  if (cleanData.officialUrl && !/^https?:\/\//i.test(cleanData.officialUrl)) return fail(requestId, 'INVALID_OFFICIAL_URL', '公开主页或报名链接需以 http:// 或 https:// 开头')
  const over = (v, m) => String(v || '').length > m
  if (over(cleanData.title, 80)) return fail(requestId, 'TITLE_TOO_LONG', '活动标题不能超过80字')
  if (over(cleanData.city, 30)) return fail(requestId, 'CITY_TOO_LONG', '城市不能超过30字')
  if (over(cleanData.location, 120)) return fail(requestId, 'LOCATION_TOO_LONG', '地点不能超过120字')
  if (over(cleanData.fee, 80)) return fail(requestId, 'FEE_TOO_LONG', '费用说明不能超过80字')
  if (over(cleanData.feeDetail, 200)) return fail(requestId, 'FEE_DETAIL_TOO_LONG', '费用补充说明不能超过200字')
  if (over(cleanData.organizer, 80)) return fail(requestId, 'ORGANIZER_TOO_LONG', '组织者不能超过80字')
  if (over(cleanData.organizerContact, 200)) return fail(requestId, 'ORGANIZER_CONTACT_TOO_LONG', '组织者联系方式不能超过200字')
  if (over(cleanData.signupNote, 300)) return fail(requestId, 'SIGNUP_NOTE_TOO_LONG', '报名方式补充说明不能超过300字')
  if (over(cleanData.description, 2000)) return fail(requestId, 'DESCRIPTION_TOO_LONG', '活动简介不能超过2000字')
  const startDate = new Date(cleanData.startTime)
  if (Number.isNaN(startDate.getTime())) return fail(requestId, 'INVALID_START_TIME', '开始时间格式不正确')
  if (cleanData.endTime) {
    const endDate = new Date(cleanData.endTime)
    if (Number.isNaN(endDate.getTime())) return fail(requestId, 'INVALID_END_TIME', '结束时间格式不正确')
    if (endDate.getTime() < startDate.getTime()) return fail(requestId, 'END_BEFORE_START', '结束时间不能早于开始时间')
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('event_submissions').where({ openid, createdAt: _.gte(since) }).count()
  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) return fail(requestId, 'DAILY_LIMIT_REACHED', '24小时内最多可提交5次活动，请稍后再试')
  const sec = await runMsgSecCheck({ content: [cleanData.title, stringifyLabels(cleanData.eventTypes || []), stringifyLabels(cleanData.audienceWho || []), cleanData.minAgeRequirement, cleanData.location, cleanData.fee, cleanData.feeDetail, cleanData.organizer, cleanData.organizerContact, cleanData.officialUrl, cleanData.signupNote, cleanData.description].filter(Boolean).join('\n'), openid, scene: 2 })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  const normalizedKey = [cleanData.title, cleanData.province, cleanData.city, cleanData.startTime].map((item) => String(item || '').trim().toLowerCase()).join('::')
  const existing = await db.collection('event_submissions').where({ normalizedKey, status: _.in(['pending', 'approved', 'merged']) }).limit(1).get()
  if (existing.data.length > 0) return fail(requestId, 'DUPLICATE_SUBMISSION', '这个活动已在审核队列或已收录，无需重复提交')
  const submitter = await getUserProfileByOpenid(openid, ['displayName', 'roles', 'city']) || {}
  try {
    await db.collection('event_submissions').add({
      data: {
        openid,
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
    return ok(requestId, { message: '提交成功，已进入审核队列' })
  } catch (err) {
    console.error('appService submitEvent error:', err)
    return fail(requestId, 'SUBMIT_EVENT_FAILED', '提交失败，请稍后重试')
  }
}

async function getEventInterestCountsBatch(event) {
  const requestId = resolveRequestId('event-interest-counts', event)
  const eventIds = Array.isArray(event.eventIds) ? event.eventIds.slice(0, 50).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) : []
  if (eventIds.length === 0) return ok(requestId, { counts: {} })
  try {
    return ok(requestId, { counts: await getCachedCounts(eventIds) })
  } catch (err) {
    console.error('appService getEventInterestCountsBatch error:', err)
    return fail(requestId, 'GET_EVENT_INTEREST_COUNTS_FAILED', '读取活动感兴趣人数失败', { counts: {} })
  }
}

async function getEventInterestInfo(event, wxContext) {
  const requestId = resolveRequestId('event-interest-info', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID', { count: 0, hasInterested: false })
  try {
    const stableDocId = buildInterestDocId(eventId, openid)
    let current = null
    try {
      current = (await db.collection('event_interest').doc(stableDocId).get()).data || null
    } catch (err) {
      current = null
    }
    let hasInterested = false
    if (current) hasInterested = current.status === 'interested'
    else {
      const mineRes = await db.collection('event_interest').where({ eventId, openid, status: _.in(['interested']) }).limit(1).get()
      hasInterested = mineRes.data.length > 0
    }
    const cachedCount = await getCachedCount(eventId)
    const count = cachedCount === null ? await syncInterestCount(eventId) : cachedCount
    return ok(requestId, { count, hasInterested })
  } catch (err) {
    console.error('appService getEventInterestInfo error:', err)
    return fail(requestId, 'GET_EVENT_INTEREST_INFO_FAILED', '读取活动感兴趣信息失败', { count: 0, hasInterested: false })
  }
}

async function toggleEventInterest(event, wxContext) {
  const requestId = resolveRequestId('toggle-interest', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')
  const stableDocId = buildInterestDocId(eventId, openid)
  try {
    let current = null
    try {
      current = (await db.collection('event_interest').doc(stableDocId).get()).data || null
    } catch (err) {
      current = null
    }
    if (!current) {
      const legacyRes = await db.collection('event_interest').where({ eventId, openid }).limit(20).get()
      const legacyList = legacyRes.data || []
      if (legacyList.length > 0) {
        const preferred = legacyList.find((item) => item.status === 'interested') || legacyList[0]
        const normalizedStatus = preferred.status === 'interested' ? 'interested' : 'cancelled'
        await db.collection('event_interest').doc(stableDocId).set({ data: { eventId, openid, status: normalizedStatus, createdAt: preferred.createdAt || db.serverDate(), updatedAt: db.serverDate() } })
        await Promise.all(legacyList.filter((item) => item._id !== stableDocId).map((item) => db.collection('event_interest').doc(item._id).remove().catch(() => null)))
        current = { _id: stableDocId, status: normalizedStatus }
      }
    }
    if (current) {
      const wasInterested = current.status === 'interested'
      const nextStatus = wasInterested ? 'cancelled' : 'interested'
      const delta = wasInterested ? -1 : 1
      await db.collection('event_interest').doc(stableDocId).update({ data: { status: nextStatus, updatedAt: db.serverDate() } })
      await updateInterestCountAfterMutation(eventId, delta)
      return ok(requestId, { hasInterested: nextStatus === 'interested', delta, message: nextStatus === 'interested' ? '已标记为感兴趣' : '已取消感兴趣' })
    }
    await db.collection('event_interest').doc(stableDocId).set({ data: { eventId, openid, status: 'interested', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    await updateInterestCountAfterMutation(eventId, 1)
    return ok(requestId, { hasInterested: true, delta: 1, message: '已标记为感兴趣' })
  } catch (err) {
    console.error('appService toggleEventInterest error:', err)
    return fail(requestId, 'TOGGLE_EVENT_INTEREST_FAILED', '操作失败，请稍后重试')
  }
}

async function getEventContactInfo(event, wxContext) {
  const requestId = resolveRequestId('get-event-contact', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')
  try {
    const profile = await getUserProfileByOpenid(openid)
    if (!(profile && profile.displayName && profile.province && profile.city)) {
      return fail(requestId, 'PROFILE_REQUIRED', '完成“我的资料”填写后，才可查看组织者联系方式', { needCompleteProfile: true })
    }
    const matched = await db.collection('event_submissions').where({ publishedEventId: eventId, status: _.in(['merged', 'approved']) }).limit(1).get()
    const submission = matched.data[0] || null
    if (!submission) return ok(requestId, { contactInfo: '', message: '该活动暂无额外联系方式' })
    return ok(requestId, {
      contactInfo: String(submission.organizerContact || '').trim(),
      publicSignupInfo: {
        officialUrl: String(submission.officialUrl || '').trim(),
        signupNote: String(submission.signupNote || '').trim(),
      },
    })
  } catch (err) {
    console.error('appService getEventContactInfo error:', err)
    return fail(requestId, 'GET_EVENT_CONTACT_INFO_FAILED', '读取联系方式失败，请稍后重试')
  }
}

module.exports = {
  getSchools,
  getSchoolDetail,
  getEvents,
  getEventDetail,
  submitCorrection,
  submitCommunity,
  submitEvent,
  getEventInterestCountsBatch,
  getEventInterestInfo,
  toggleEventInterest,
  getEventContactInfo,
}
