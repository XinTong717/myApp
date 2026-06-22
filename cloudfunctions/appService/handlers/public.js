const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { runMsgSecCheck } = require('../lib/security')
const {
  listSchools,
  listSchoolMarkers,
  getSchoolById,
  listEvents,
  getEventById,
} = require('../lib/contentRepo')
const {
  normalizeStringArray,
  mergeOtherOption,
  stringifyLabels,
  validateLength,
} = require('../lib/normalize')
const { getUserProfileByOpenid } = require('../lib/userRepo')

const COUNT_COLLECTION = 'event_interest_counts'
const DAILY_SUBMISSION_LIMIT = 5
const ACTIVE_SUBMISSION_STATUSES = ['pending', 'merged']
const EVENT_FIELD_SELECTION = {
  id: true,
  title: true,
  province: true,
  city: true,
  event_type: true,
  event_types: true,
  audience_who: true,
  min_age_requirement: true,
  max_age_requirement: true,
  signup_deadline: true,
  is_recurring: true,
  recurrence_pattern: true,
  fee_category: true,
  description: true,
  start_time: true,
  end_time: true,
  location: true,
  fee: true,
  status: true,
  organizer: true,
  is_online: true,
}
const CORRECTION_TARGETS = {
  school: { collection: 'school_corrections', idField: 'schoolId', titleField: 'schoolName', missingMessage: '缺少学习社区信息' },
  event: { collection: 'event_corrections', idField: 'eventId', titleField: 'eventTitle', missingMessage: '缺少活动信息' },
}

function buildInterestDocId(eventId, openid) { return `event_${eventId}_${openid}` }
function buildCountDocId(eventId) { return String(eventId) }
function buildContentSecurityFields(sec = {}) {
  return {
    contentSecurityStatus: sec.contentSecurityStatus || 'unknown',
    contentSecuritySuggest: sec.contentSecuritySuggest || '',
    contentSecurityLabel: sec.contentSecurityLabel || '',
    contentSecurityErrorCode: sec.contentSecurityErrorCode || 0,
    contentSecurityError: sec.contentSecurityError || '',
  }
}

function pickStringFields(event, allowed) {
  const cleanData = { updatedAt: db.serverDate() }
  for (const key of allowed) {
    if (event[key] === undefined) continue
    if (key === 'isOnline' || key === 'isRecurring') cleanData[key] = !!event[key]
    else if (['eventTypes', 'audienceWho', 'schoolType', 'ageRange'].includes(key)) cleanData[key] = normalizeStringArray(event[key])
    else cleanData[key] = String(event[key] || '').trim()
  }
  return cleanData
}

async function getCachedCount(eventId) {
  try {
    const cacheRes = await db.collection(COUNT_COLLECTION).doc(buildCountDocId(eventId)).get()
    return Number(cacheRes.data?.count || 0)
  } catch (err) { return null }
}

async function getCachedCounts(eventIds) {
  const counts = {}
  const ids = eventIds.map(buildCountDocId)
  if (ids.length > 0) {
    try {
      const cachedRes = await db.collection(COUNT_COLLECTION).where({ _id: _.in(ids) }).get()
      for (const item of cachedRes.data || []) counts[Number(item.eventId || item._id)] = Number(item.count || 0)
    } catch (err) { console.warn('event interest count cache read skipped:', err) }
  }
  for (const eventId of eventIds) if (!Object.prototype.hasOwnProperty.call(counts, eventId)) counts[eventId] = 0
  return counts
}

async function adjustInterestCountCache(eventId, delta) {
  const safeDelta = Number(delta || 0)
  if (!safeDelta) return
  const docId = buildCountDocId(eventId)
  try {
    await db.collection(COUNT_COLLECTION).doc(docId).update({ data: { eventId, count: _.inc(safeDelta), updatedAt: db.serverDate() } })
  } catch (err) {
    try {
      await db.collection(COUNT_COLLECTION).doc(docId).set({ data: { eventId, count: 0, updatedAt: db.serverDate(), createdAt: db.serverDate() } })
      await db.collection(COUNT_COLLECTION).doc(docId).update({ data: { eventId, count: _.inc(safeDelta), updatedAt: db.serverDate() } })
    } catch (initErr) { console.warn('event interest count initialize+inc degraded:', initErr) }
  }
}

function attachInterestCounts(events, counts = {}) {
  return events.map((item) => ({ ...item, interest_count: counts[Number(item.id)] || 0 }))
}

async function getSchools(event) {
  const requestId = resolveRequestId('get-schools', event)
  try {
    const schools = await listSchools({ limit: event?.limit, province: event?.province, provinces: event?.provinces, city: event?.city, cities: event?.cities, schoolType: event?.schoolType || event?.type, schoolTypes: event?.schoolTypes || event?.types, ageRange: event?.ageRange, ageRanges: event?.ageRanges })
    return ok(requestId, { schools })
  } catch (err) {
    console.error('appService getSchools error:', err)
    return fail(requestId, 'GET_SCHOOLS_FAILED', '读取学习社区失败，请稍后重试', { schools: [] })
  }
}

async function getSchoolMarkers(event) {
  const requestId = resolveRequestId('get-school-markers', event)
  try {
    const schools = await listSchoolMarkers({ limit: event?.limit, province: event?.province, provinces: event?.provinces, city: event?.city, cities: event?.cities, schoolType: event?.schoolType || event?.type, schoolTypes: event?.schoolTypes || event?.types, ageRange: event?.ageRange, ageRanges: event?.ageRanges })
    return ok(requestId, { schools })
  } catch (err) {
    console.error('appService getSchoolMarkers error:', err)
    return fail(requestId, 'GET_SCHOOL_MARKERS_FAILED', '读取学习社区标记失败，请稍后重试', { schools: [] })
  }
}

async function getSchoolDetail(event) {
  const requestId = resolveRequestId('get-school-detail', event)
  try {
    const schoolId = Number(event?.schoolId || 0)
    if (!schoolId) return fail(requestId, 'BAD_REQUEST', 'schoolId 无效', { school: null })
    return ok(requestId, { school: await getSchoolById(schoolId) })
  } catch (err) {
    console.error('appService getSchoolDetail error:', err)
    return fail(requestId, 'GET_SCHOOL_DETAIL_FAILED', '读取学习社区详情失败，请稍后重试', { school: null })
  }
}

async function getEvents(event) {
  const requestId = resolveRequestId('get-events', event)
  try {
    const events = await listEvents({ limit: event?.limit, includeEnded: event?.includeEnded === true })
    if (event?.includeInterestCounts === false || events.length === 0) return ok(requestId, { events })
    const eventIds = events.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0)
    const counts = await getCachedCounts(eventIds)
    return ok(requestId, { events: attachInterestCounts(events, counts) })
  } catch (err) {
    console.error('appService getEvents error:', err)
    return fail(requestId, 'GET_EVENTS_FAILED', '读取活动失败，请稍后重试', { events: [] })
  }
}

async function getEventDetail(event) {
  const requestId = resolveRequestId('get-event-detail', event)
  try {
    const eventId = Number(event?.eventId || 0)
    if (!eventId) return fail(requestId, 'BAD_REQUEST', 'eventId 无效', { event: null })
    return ok(requestId, { event: await getEventById(eventId) })
  } catch (err) {
    console.error('appService getEventDetail error:', err)
    return fail(requestId, 'GET_EVENT_DETAIL_FAILED', '读取活动详情失败，请稍后重试', { event: null })
  }
}

async function submitCorrection(event, wxContext) {
  const requestId = resolveRequestId('submit-correction', event)
  const openid = wxContext.OPENID
  const targetType = String(event.targetType || '').trim()
  const config = CORRECTION_TARGETS[targetType]
  const targetId = Number(event.targetId || 0)
  const targetTitle = String(event.targetTitle || '').trim()
  const content = String(event.content || '').trim()
  if (!content) return fail(requestId, 'CONTENT_REQUIRED', '内容不能为空')
  if (!config) return fail(requestId, 'INVALID_TARGET_TYPE', '纠错对象类型不合法')
  if (!targetId) return fail(requestId, 'BAD_REQUEST', config.missingMessage)
  const sec = await runMsgSecCheck({ content, openid, scene: 2, blockedMessage: '内容包含不合规信息，请修改后重试', failedMessage: '内容审核失败，请稍后重试' })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  try {
    await db.collection(config.collection).add({ data: { openid, targetType, targetId, targetTitle, [config.idField]: targetId, [config.titleField]: targetTitle, content, ...buildContentSecurityFields(sec), status: 'pending', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    return ok(requestId, { message: '提交成功' })
  } catch (err) {
    console.error('appService submitCorrection error:', err)
    return fail(requestId, 'SUBMIT_CORRECTION_FAILED', '提交失败，请稍后重试')
  }
}

async function submitSchool(event, wxContext) {
  const requestId = resolveRequestId('submit-school', event)
  const openid = wxContext.OPENID
  const cleanData = pickStringFields(event, ['name', 'province', 'city', 'schoolType', 'schoolTypeOther', 'ageRange', 'ageRangeOther', 'officialUrl', 'publicAccountNote', 'xujiNote', 'residencyReq', 'admissionReq', 'participationNote', 'feeNote', 'outputDirection', 'sourceNote', 'recommendationNote'])
  cleanData.schoolType = mergeOtherOption(cleanData.schoolType || [], cleanData.schoolTypeOther)
  cleanData.ageRange = mergeOtherOption(cleanData.ageRange || [], cleanData.ageRangeOther)
  cleanData.officialUrl = cleanData.officialUrl || cleanData.publicAccountNote || ''
  cleanData.admissionReq = cleanData.admissionReq || cleanData.participationNote || ''
  if (!cleanData.name) return fail(requestId, 'NAME_REQUIRED', '请填写学习社区名称')
  if (!cleanData.province || !cleanData.city) return fail(requestId, 'CITY_REQUIRED', '请选择所在城市')
  const lengthError = validateLength('学习社区名称', cleanData.name, 100) || validateLength('城市', cleanData.city, 30) || validateLength('官方/说明链接', cleanData.officialUrl, 300) || validateLength('公开说明', cleanData.xujiNote, 500) || validateLength('参与前了解', cleanData.residencyReq, 400) || validateLength('参与方式参考', cleanData.admissionReq, 400) || validateLength('费用说明', cleanData.feeNote, 200) || validateLength('相关说明', cleanData.outputDirection, 500) || validateLength('信息来源', cleanData.sourceNote, 300) || validateLength('推荐理由', cleanData.recommendationNote, 1000)
  if (lengthError) return fail(requestId, 'INVALID_LENGTH', lengthError)
  const sec = await runMsgSecCheck({ content: [cleanData.name, stringifyLabels(cleanData.schoolType || []), stringifyLabels(cleanData.ageRange || []), cleanData.officialUrl, cleanData.xujiNote, cleanData.residencyReq, cleanData.admissionReq, cleanData.feeNote, cleanData.outputDirection, cleanData.sourceNote, cleanData.recommendationNote].filter(Boolean).join('\n'), openid, scene: 2 })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('school_submissions').where({ openid, createdAt: _.gte(since) }).count()
  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) return fail(requestId, 'DAILY_LIMIT_REACHED', '24小时内最多可提交5次推荐，请稍后再试')
  const normalizedKey = [cleanData.name, cleanData.province, cleanData.city].map((item) => String(item || '').trim().toLowerCase()).join('::')
  const existing = await db.collection('school_submissions').where({ normalizedKey, status: _.in(ACTIVE_SUBMISSION_STATUSES) }).limit(1).get()
  if (existing.data.length > 0) return fail(requestId, 'DUPLICATE_SUBMISSION', '这个学习社区已在审核队列或已收录，无需重复提交')
  const submitter = await getUserProfileByOpenid(openid, ['displayName', 'roles', 'city']) || {}
  try {
    await db.collection('school_submissions').add({ data: { openid, submitterDisplayName: submitter.displayName || '', submitterRoles: submitter.roles || [], submitterCity: submitter.city || '', normalizedKey, name: cleanData.name, province: cleanData.province, city: cleanData.city, schoolType: stringifyLabels(cleanData.schoolType || []), schoolTypes: cleanData.schoolType || [], ageRange: stringifyLabels(cleanData.ageRange || []), ageRanges: cleanData.ageRange || [], officialUrl: cleanData.officialUrl || '', publicAccountNote: cleanData.publicAccountNote || '', xujiNote: cleanData.xujiNote || '', residencyReq: cleanData.residencyReq || '', admissionReq: cleanData.admissionReq || '', participationNote: cleanData.admissionReq || '', feeNote: cleanData.feeNote || '', outputDirection: cleanData.outputDirection || '', sourceNote: cleanData.sourceNote || '', recommendationNote: cleanData.recommendationNote || '', ...buildContentSecurityFields(sec), status: 'pending', adminNote: '', reviewedAt: null, reviewedBy: '', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    return ok(requestId, { message: '提交成功，感谢推荐' })
  } catch (err) {
    console.error('appService submitSchool error:', err)
    return fail(requestId, 'SUBMIT_SCHOOL_FAILED', '提交失败，请稍后重试')
  }
}

async function submitEvent(event, wxContext) {
  const requestId = resolveRequestId('submit-event', event)
  const openid = wxContext.OPENID
  const cleanData = pickStringFields(event, ['title', 'province', 'city', 'eventTypes', 'eventTypeOther', 'audienceWho', 'audienceWhoOther', 'minAgeRequirement', 'maxAgeRequirement', 'startTime', 'endTime', 'signupDeadline', 'isRecurring', 'recurrencePattern', 'isOnline', 'location', 'fee', 'feeDetail', 'organizer', 'organizerContact', 'officialUrl', 'signupNote', 'description'])
  cleanData.eventTypes = mergeOtherOption(cleanData.eventTypes || [], cleanData.eventTypeOther)
  cleanData.audienceWho = mergeOtherOption(cleanData.audienceWho || [], cleanData.audienceWhoOther)
  cleanData.eventType = (cleanData.eventTypes || []).find((item) => !String(item).startsWith('其他：')) || (cleanData.eventTypes || [])[0] || ''
  if (!cleanData.title) return fail(requestId, 'TITLE_REQUIRED', '请填写活动标题')
  if (!cleanData.province || !cleanData.city) return fail(requestId, 'CITY_REQUIRED', '请选择所在城市')
  if (!cleanData.startTime) return fail(requestId, 'START_TIME_REQUIRED', '请填写开始时间')
  if (!cleanData.description) return fail(requestId, 'DESCRIPTION_REQUIRED', '请填写活动简介')
  if (!cleanData.organizer) return fail(requestId, 'ORGANIZER_REQUIRED', '请填写组织者')
  if (!cleanData.fee) return fail(requestId, 'FEE_REQUIRED', '请填写费用信息')
  if (cleanData.isRecurring && !cleanData.recurrencePattern) return fail(requestId, 'RECURRENCE_REQUIRED', '请选择周期时间')
  const over = (v, m) => String(v || '').length > m
  const lengthError = over(cleanData.title, 80) && '活动标题不能超过80字' || over(cleanData.city, 30) && '城市不能超过30字' || over(cleanData.location, 120) && '地点不能超过120字' || over(cleanData.fee, 80) && '费用说明不能超过80字' || over(cleanData.feeDetail, 200) && '费用补充说明不能超过200字' || over(cleanData.organizer, 80) && '组织者不能超过80字' || over(cleanData.organizerContact, 200) && '组织者联系方式不能超过200字' || over(cleanData.officialUrl, 300) && '公开链接不能超过300字' || over(cleanData.signupNote, 300) && '报名方式补充说明不能超过300字' || over(cleanData.description, 2000) && '活动简介不能超过2000字'
  if (lengthError) return fail(requestId, 'INVALID_LENGTH', lengthError)
  const startDate = new Date(cleanData.startTime)
  if (Number.isNaN(startDate.getTime())) return fail(requestId, 'INVALID_START_TIME', '开始时间格式不正确')
  if (cleanData.endTime) {
    const endDate = new Date(cleanData.endTime)
    if (Number.isNaN(endDate.getTime())) return fail(requestId, 'INVALID_END_TIME', '结束时间格式不正确')
    if (endDate.getTime() < startDate.getTime()) return fail(requestId, 'END_BEFORE_START', '结束时间不能早于开始时间')
  }
  if (cleanData.signupDeadline) {
    const deadlineDate = new Date(cleanData.signupDeadline)
    if (Number.isNaN(deadlineDate.getTime())) return fail(requestId, 'INVALID_SIGNUP_DEADLINE', '报名截止时间格式不正确')
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCountRes = await db.collection('event_submissions').where({ openid, createdAt: _.gte(since) }).count()
  if ((recentCountRes?.total || 0) >= DAILY_SUBMISSION_LIMIT) return fail(requestId, 'DAILY_LIMIT_REACHED', '24小时内最多可提交5次活动，请稍后再试')
  const sec = await runMsgSecCheck({ content: [cleanData.title, stringifyLabels(cleanData.eventTypes || []), stringifyLabels(cleanData.audienceWho || []), cleanData.minAgeRequirement, cleanData.maxAgeRequirement, cleanData.signupDeadline, cleanData.recurrencePattern, cleanData.location, cleanData.fee, cleanData.feeDetail, cleanData.organizer, cleanData.organizerContact, cleanData.officialUrl, cleanData.signupNote, cleanData.description].filter(Boolean).join('\n'), openid, scene: 2 })
  if (!sec.ok) return fail(requestId, sec.code || 'CONTENT_SECURITY_BLOCKED', sec.message)
  const normalizedKey = [cleanData.title, cleanData.province, cleanData.city, cleanData.startTime].map((item) => String(item || '').trim().toLowerCase()).join('::')
  const existing = await db.collection('event_submissions').where({ normalizedKey, status: _.in(ACTIVE_SUBMISSION_STATUSES) }).limit(1).get()
  if (existing.data.length > 0) return fail(requestId, 'DUPLICATE_SUBMISSION', '这个活动已在审核队列或已收录，无需重复提交')
  const submitter = await getUserProfileByOpenid(openid, ['displayName', 'roles', 'city']) || {}
  try {
    await db.collection('event_submissions').add({ data: { openid, submitterDisplayName: submitter.displayName || '', submitterRoles: submitter.roles || [], submitterCity: submitter.city || '', normalizedKey, title: cleanData.title, province: cleanData.province, city: cleanData.city, eventType: cleanData.eventType || '', eventTypes: cleanData.eventTypes || [], audienceWho: stringifyLabels(cleanData.audienceWho || []), audienceWhoTags: cleanData.audienceWho || [], minAgeRequirement: cleanData.minAgeRequirement || '', maxAgeRequirement: cleanData.maxAgeRequirement || '', startTime: cleanData.startTime, endTime: cleanData.endTime || '', signupDeadline: cleanData.signupDeadline || '', isRecurring: !!cleanData.isRecurring, recurrencePattern: cleanData.isRecurring ? cleanData.recurrencePattern || '' : '', isOnline: !!cleanData.isOnline, location: cleanData.location || '', fee: cleanData.fee || '', feeDetail: cleanData.feeDetail || '', organizer: cleanData.organizer || '', organizerContact: cleanData.organizerContact || '', officialUrl: cleanData.officialUrl || '', signupNote: cleanData.signupNote || '', description: cleanData.description || '', ...buildContentSecurityFields(sec), status: 'pending', adminNote: '', reviewedAt: null, reviewedBy: '', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
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
  try { return ok(requestId, { counts: await getCachedCounts(eventIds) }) }
  catch (err) { console.warn('appService getEventInterestCountsBatch degraded:', err); return ok(requestId, { counts: {}, degraded: true }) }
}

async function getEventInterestInfo(event, wxContext) {
  const requestId = resolveRequestId('event-interest-info', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID', { count: 0, hasInterested: false })
  let hasInterested = false
  let degraded = false
  try {
    const stableRes = await db.collection('event_interest').doc(buildInterestDocId(eventId, openid)).get()
    hasInterested = stableRes.data?.status === 'interested'
  } catch (err) { degraded = true; console.warn('getEventInterestInfo canonical read failed:', err) }
  const cachedCount = await getCachedCount(eventId)
  return ok(requestId, { count: cachedCount === null ? 0 : cachedCount, hasInterested, degraded })
}

async function toggleEventInterest(event, wxContext) {
  const requestId = resolveRequestId('toggle-interest', event)
  const openid = wxContext.OPENID
  const eventId = Number(event.eventId || 0)
  if (!eventId) return fail(requestId, 'BAD_REQUEST', '缺少活动 ID')
  const docId = buildInterestDocId(eventId, openid)
  try {
    let current = null
    try { current = (await db.collection('event_interest').doc(docId).get()).data || null } catch (err) { current = null }
    if (current) {
      const wasInterested = current.status === 'interested'
      const nextStatus = wasInterested ? 'cancelled' : 'interested'
      const delta = wasInterested ? -1 : 1
      await db.collection('event_interest').doc(docId).update({ data: { status: nextStatus, updatedAt: db.serverDate() } })
      await adjustInterestCountCache(eventId, delta)
      return ok(requestId, { hasInterested: nextStatus === 'interested', delta, message: nextStatus === 'interested' ? '已标记感兴趣' : '已取消感兴趣' })
    }
    await db.collection('event_interest').doc(docId).set({ data: { eventId, openid, status: 'interested', createdAt: db.serverDate(), updatedAt: db.serverDate() } })
    await adjustInterestCountCache(eventId, 1)
    return ok(requestId, { hasInterested: true, delta: 1, message: '已标记感兴趣' })
  } catch (err) {
    console.error('appService toggleEventInterest error:', err)
    return fail(requestId, 'TOGGLE_EVENT_INTEREST_FAILED', '操作失败，请稍后重试')
  }
}

async function getMyFavoriteEvents(event, wxContext) {
  const requestId = resolveRequestId('my-interest-events', event)
  const openid = wxContext.OPENID
  const limit = Math.min(Math.max(Number(event?.limit || 20), 1), 50)
  try {
    const favoriteRes = await db.collection('event_interest').where({ openid, status: 'interested' }).field({ eventId: true, updatedAt: true }).orderBy('updatedAt', 'desc').limit(limit).get()
    const eventIds = (favoriteRes.data || []).map((item) => Number(item.eventId)).filter((id) => Number.isFinite(id) && id > 0)
    if (eventIds.length === 0) return ok(requestId, { events: [] })
    const eventRes = await db.collection('events').where({ id: _.in(eventIds) }).field(EVENT_FIELD_SELECTION).limit(eventIds.length).get()
    const eventMap = new Map((eventRes.data || []).map((item) => [Number(item.id), item]))
    const counts = await getCachedCounts(eventIds)
    const events = eventIds.map((id) => eventMap.get(id)).filter(Boolean).map((item) => ({ ...item, interest_count: counts[Number(item.id)] || 0 }))
    return ok(requestId, { events })
  } catch (err) {
    console.error('appService getMyFavoriteEvents error:', err)
    return fail(requestId, 'GET_MY_FAVORITE_EVENTS_FAILED', '读取感兴趣活动失败，请稍后重试', { events: [] })
  }
}

module.exports = { getSchools, getSchoolMarkers, getSchoolDetail, getEvents, getEventDetail, submitCorrection, submitSchool, submitEvent, getEventInterestCountsBatch, getEventInterestInfo, toggleEventInterest, getMyFavoriteEvents }
