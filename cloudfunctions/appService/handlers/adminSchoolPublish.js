const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')

const SCHOOL_COUNTER_DOC_ID = 'schools'
const COUNTERS_COLLECTION = 'counters'
const SCHOOL_LOCATION_COLLECTION = 'school_locations'
const SCHOOL_ID_ALLOCATION_MAX_RETRIES = 5
const DUPLICATE_CANDIDATE_LIMIT = 12
const MIN_COORD_DISTANCE = 0.025

const CITY_COORDS = {
  上海: { lat: 31.2304, lng: 121.4737, prov: '上海' },
  北京: { lat: 39.9042, lng: 116.4074, prov: '北京' },
  天津: { lat: 39.3434, lng: 117.3616, prov: '天津' },
  重庆: { lat: 29.5630, lng: 106.5516, prov: '重庆' },
  广州: { lat: 23.1291, lng: 113.2644, prov: '广东' },
  深圳: { lat: 22.5431, lng: 114.0579, prov: '广东' },
  珠海: { lat: 22.2707, lng: 113.5767, prov: '广东' },
  佛山: { lat: 23.0218, lng: 113.1219, prov: '广东' },
  中山: { lat: 22.5176, lng: 113.3926, prov: '广东' },
  汕头: { lat: 23.3541, lng: 116.6819, prov: '广东' },
  杭州: { lat: 30.2741, lng: 120.1551, prov: '浙江' },
  温州: { lat: 28.0006, lng: 120.6722, prov: '浙江' },
  宁波: { lat: 29.8683, lng: 121.5440, prov: '浙江' },
  丽水: { lat: 28.4680, lng: 119.9229, prov: '浙江' },
  湖州: { lat: 30.8927, lng: 120.0931, prov: '浙江' },
  绍兴: { lat: 30.0023, lng: 120.5822, prov: '浙江' },
  舟山: { lat: 29.9853, lng: 122.2072, prov: '浙江' },
  东阳: { lat: 29.2895, lng: 120.2419, prov: '浙江' },
  衢州: { lat: 28.9353, lng: 118.8597, prov: '浙江' },
  南京: { lat: 32.0603, lng: 118.7969, prov: '江苏' },
  苏州: { lat: 31.2990, lng: 120.5853, prov: '江苏' },
  昆山: { lat: 31.3856, lng: 120.9818, prov: '江苏' },
  常熟: { lat: 31.6538, lng: 120.7525, prov: '江苏' },
  常州: { lat: 31.8106, lng: 119.9740, prov: '江苏' },
  徐州: { lat: 34.2044, lng: 117.2858, prov: '江苏' },
  成都: { lat: 30.5728, lng: 104.0668, prov: '四川' },
  广元: { lat: 32.4354, lng: 105.8440, prov: '四川' },
  福州: { lat: 26.0745, lng: 119.2965, prov: '福建' },
  龙岩: { lat: 25.0751, lng: 117.0175, prov: '福建' },
  济南: { lat: 36.6512, lng: 116.9972, prov: '山东' },
  青岛: { lat: 36.0671, lng: 120.3826, prov: '山东' },
  曲阜: { lat: 35.5809, lng: 116.9865, prov: '山东' },
  潍坊: { lat: 36.7068, lng: 119.1618, prov: '山东' },
  西安: { lat: 34.3416, lng: 108.9398, prov: '陕西' },
  郑州: { lat: 34.7466, lng: 113.6253, prov: '河南' },
  开封: { lat: 34.7971, lng: 114.3416, prov: '河南' },
  南阳: { lat: 32.9908, lng: 112.5283, prov: '河南' },
  汝阳: { lat: 34.1543, lng: 112.4734, prov: '河南' },
  保定: { lat: 38.8739, lng: 115.4646, prov: '河北' },
  衡水: { lat: 37.7390, lng: 115.6700, prov: '河北' },
  武汉: { lat: 30.5928, lng: 114.3055, prov: '湖北' },
  十堰: { lat: 32.6294, lng: 110.7989, prov: '湖北' },
  长沙: { lat: 28.2282, lng: 112.9388, prov: '湖南' },
  郴州: { lat: 25.7702, lng: 113.0148, prov: '湖南' },
  大理: { lat: 25.6065, lng: 100.2676, prov: '云南' },
  昆明: { lat: 25.0389, lng: 102.7183, prov: '云南' },
  丽江: { lat: 26.8565, lng: 100.2271, prov: '云南' },
  玉溪: { lat: 24.3517, lng: 102.5470, prov: '云南' },
  贵阳: { lat: 26.6470, lng: 106.6302, prov: '贵州' },
  遵义: { lat: 27.7254, lng: 106.9272, prov: '贵州' },
  黔西南: { lat: 25.0880, lng: 104.9060, prov: '贵州' },
  黔南: { lat: 26.2582, lng: 107.5234, prov: '贵州' },
  南宁: { lat: 22.8170, lng: 108.3665, prov: '广西' },
  桂林: { lat: 25.2736, lng: 110.2900, prov: '广西' },
  太原: { lat: 37.8706, lng: 112.5489, prov: '山西' },
  长治: { lat: 36.1954, lng: 113.1163, prov: '山西' },
  闻喜: { lat: 35.3566, lng: 111.2247, prov: '山西' },
  宣城: { lat: 30.9408, lng: 118.7588, prov: '安徽' },
  合肥: { lat: 31.8206, lng: 117.2272, prov: '安徽' },
  六安: { lat: 31.7337, lng: 116.5219, prov: '安徽' },
  滁州: { lat: 32.3016, lng: 118.3163, prov: '安徽' },
  大连: { lat: 38.9140, lng: 121.6147, prov: '辽宁' },
  沈阳: { lat: 41.8057, lng: 123.4315, prov: '辽宁' },
  通化: { lat: 41.7280, lng: 125.9400, prov: '吉林' },
  长春: { lat: 43.8171, lng: 125.3235, prov: '吉林' },
  哈尔滨: { lat: 45.8038, lng: 126.5350, prov: '黑龙江' },
  黑河: { lat: 50.2455, lng: 127.5285, prov: '黑龙江' },
  海口: { lat: 20.0174, lng: 110.3493, prov: '海南' },
  三亚: { lat: 18.2528, lng: 109.5120, prov: '海南' },
  澄迈: { lat: 19.7383, lng: 110.0075, prov: '海南' },
  兰州: { lat: 36.0611, lng: 103.8343, prov: '甘肃' },
  银川: { lat: 38.4872, lng: 106.2309, prov: '宁夏' },
  南昌: { lat: 28.6820, lng: 115.8579, prov: '江西' },
  呼和浩特: { lat: 40.8424, lng: 111.7490, prov: '内蒙古' },
  乌鲁木齐: { lat: 43.8256, lng: 87.6168, prov: '新疆' },
  拉萨: { lat: 29.6500, lng: 91.1409, prov: '西藏' },
  西宁: { lat: 36.6171, lng: 101.7782, prov: '青海' },
  香港: { lat: 22.3193, lng: 114.1694, prov: '香港' },
  澳门: { lat: 22.1987, lng: 113.5439, prov: '澳门' },
  台北: { lat: 25.0330, lng: 121.5654, prov: '台湾' },
}

const PROV_COORDS = {
  上海: { lat: 31.2304, lng: 121.4737 }, 北京: { lat: 39.9042, lng: 116.4074 }, 天津: { lat: 39.3434, lng: 117.3616 }, 重庆: { lat: 29.5630, lng: 106.5516 },
  广东: { lat: 23.1291, lng: 113.2644 }, 浙江: { lat: 30.2741, lng: 120.1551 }, 江苏: { lat: 32.0603, lng: 118.7969 }, 四川: { lat: 30.5728, lng: 104.0668 },
  福建: { lat: 26.0745, lng: 119.2965 }, 山东: { lat: 36.6512, lng: 116.9972 }, 湖北: { lat: 30.5928, lng: 114.3055 }, 湖南: { lat: 28.2282, lng: 112.9388 },
  河南: { lat: 34.7466, lng: 113.6253 }, 河北: { lat: 38.0428, lng: 114.5149 }, 安徽: { lat: 31.8206, lng: 117.2272 }, 陕西: { lat: 34.3416, lng: 108.9398 },
  江西: { lat: 28.6820, lng: 115.8579 }, 广西: { lat: 22.8170, lng: 108.3665 }, 云南: { lat: 25.0389, lng: 102.7183 }, 贵州: { lat: 26.6470, lng: 106.6302 },
  山西: { lat: 37.8706, lng: 112.5489 }, 辽宁: { lat: 41.8057, lng: 123.4315 }, 吉林: { lat: 43.8171, lng: 125.3235 }, 黑龙江: { lat: 45.8038, lng: 126.5350 },
  甘肃: { lat: 36.0611, lng: 103.8343 }, 宁夏: { lat: 38.4872, lng: 106.2309 }, 海南: { lat: 20.0174, lng: 110.3493 }, 内蒙古: { lat: 40.8424, lng: 111.7490 },
  新疆: { lat: 43.8256, lng: 87.6168 }, 西藏: { lat: 29.6500, lng: 91.1409 }, 青海: { lat: 36.6171, lng: 101.7782 },
}

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase()
}

function isReadableStatus(value) {
  const status = normalizeStatus(value)
  return !status || !['deleted', 'removed', 'archived', 'hidden'].includes(status)
}

function stringifyLabels(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map(normalizeString).filter(Boolean))).join('、')
}

function isOnlineSubmission(submission) {
  return !!submission.isOnline || normalizeString(submission.province) === '线上' || normalizeString(submission.city) === '线上'
}

function getSchoolTypeText(submission) {
  const values = Array.isArray(submission.schoolTypes) ? [...submission.schoolTypes] : []
  const single = normalizeString(submission.schoolType)
  if (single) values.push(single)
  const other = normalizeString(submission.schoolTypeOther)
  return stringifyLabels(values.map((item) => item === '其他' && other ? other : item))
}

function getAgeRangeText(submission) {
  return stringifyLabels(submission.ageRange || submission.ageRanges || [])
}

function buildSchoolPublishPayload(submission) {
  const name = normalizeString(submission.name)
  const online = isOnlineSubmission(submission)
  const province = online ? '线上' : normalizeString(submission.province)
  const city = online ? '线上' : normalizeString(submission.city)

  const schoolPayload = {
    name,
    canonical_name: name,
    school_type: getSchoolTypeText(submission),
    boarding_type: normalizeString(submission.boardingType) || '待确认',
    age_range: getAgeRangeText(submission),
    official_url: normalizeString(submission.officialUrl || submission.publicAccountNote),
    xuji_note: normalizeString(submission.xujiNote),
    residency_req: normalizeString(submission.residencyReq),
    admission_req: normalizeString(submission.admissionReq || submission.participationNote),
    fee: normalizeString(submission.feeNote),
    output_direction: normalizeString(submission.outputDirection),
    status: 'published',
    source: 'school_submission',
  }

  const locationPayload = {
    province,
    city,
    address_note: '',
    contact_note: '',
    status: 'published',
    source: 'school_submission',
    location_type: online ? 'online' : 'offline',
    is_online: online,
  }

  const auditOnly = {
    sourceNote: normalizeString(submission.sourceNote),
    recommendationNote: normalizeString(submission.recommendationNote),
    submitterDisplayName: normalizeString(submission.submitterDisplayName),
    submitterCity: normalizeString(submission.submitterCity),
    contentSecurityStatus: normalizeString(submission.contentSecurityStatus || 'unknown'),
  }

  const warnings = []
  if (!schoolPayload.name) warnings.push('缺少学习社区名称')
  if (!online && (!locationPayload.province || !locationPayload.city)) warnings.push('缺少线下地点信息')
  if (online) warnings.push('线上社区会显示在学习社区数量与列表中，但不会生成地图点位')
  if (!schoolPayload.official_url) warnings.push('缺少官方/说明链接，发布前建议补充可核验来源')
  if (!schoolPayload.xuji_note && !schoolPayload.residency_req && !schoolPayload.admission_req) warnings.push('公开详情字段较少，发布前建议补充学籍/资质说明或参与方式')

  return { schoolPayload, locationPayload, auditOnly, warnings }
}

function getCoordFromLocation(location) {
  const lat = Number(location?.latitude)
  const lng = Number(location?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function distanceScore(a, b) {
  const cosLat = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * safeCosLat
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

function nameHash(value) {
  const text = normalizeString(value)
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) - h + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

function averageCoord(locations) {
  const coords = (locations || []).map(getCoordFromLocation).filter(Boolean)
  if (coords.length === 0) return null
  return {
    lat: coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length,
    lng: coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length,
  }
}

function getBaseCoord(province, city, existingLocations) {
  const average = averageCoord(existingLocations)
  if (average) return { ...average, geocodeStatus: 'city_average_jitter', coordinateLevel: 'city' }
  const cityCoord = CITY_COORDS[city]
  if (cityCoord) return { lat: cityCoord.lat, lng: cityCoord.lng, geocodeStatus: 'city_jitter', coordinateLevel: 'city' }
  const provinceCoord = PROV_COORDS[province]
  if (provinceCoord) return { lat: provinceCoord.lat, lng: provinceCoord.lng, geocodeStatus: 'province_fallback_jitter', coordinateLevel: 'province' }
  return null
}

function pickNonOverlappingCoord(base, existingLocations, seedText) {
  const existing = (existingLocations || []).map(getCoordFromLocation).filter(Boolean)
  const seed = nameHash(seedText)
  const cosLat = Math.cos(base.lat * Math.PI / 180)
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat

  for (let i = 0; i < 48; i += 1) {
    const radius = i === 0 ? 0 : 0.018 + Math.floor((i - 1) / 8) * 0.018
    const angle = ((seed % 360) + i * 137.508) * Math.PI / 180
    const candidate = {
      lat: base.lat + Math.sin(angle) * radius,
      lng: base.lng + Math.cos(angle) * radius / safeCosLat,
    }
    if (existing.every((coord) => distanceScore(candidate, coord) >= MIN_COORD_DISTANCE)) return candidate
  }

  return {
    lat: base.lat + ((seed % 100) / 100 - 0.5) * 0.18,
    lng: base.lng + (((Math.floor(seed / 100) % 100) / 100 - 0.5) * 0.18) / safeCosLat,
  }
}

async function getSchoolSubmissionById(submissionId) {
  try {
    const res = await db.collection('school_submissions').doc(submissionId).get()
    return res.data || null
  } catch (err) {
    const message = String(err?.errMsg || err?.message || '')
    if (message.includes('does not exist') || message.includes('document.get:fail')) return null
    throw err
  }
}

async function getLocationsBySchoolIds(schoolIds) {
  const ids = Array.from(new Set((schoolIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (ids.length === 0) return []
  const all = []
  for (let i = 0; i < ids.length; i += 100) {
    const res = await db.collection(SCHOOL_LOCATION_COLLECTION).where({ school_id: _.in(ids.slice(i, i + 100)) }).limit(1000).get()
    all.push(...((res.data || []).filter((item) => isReadableStatus(item.status))))
  }
  return all
}

async function getExistingLocationsForGeo(locationPayload) {
  if (locationPayload.is_online) return []
  const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
    .where({ province: locationPayload.province, city: locationPayload.city })
    .limit(1000)
    .get()
  return (res.data || []).filter((item) => isReadableStatus(item.status))
}

async function enrichLocationPayload(locationPayload, schoolName) {
  if (locationPayload.is_online) return { locationPayload, warnings: [] }
  const existingLocations = await getExistingLocationsForGeo(locationPayload)
  const base = getBaseCoord(locationPayload.province, locationPayload.city, existingLocations)
  if (!base) return { locationPayload, warnings: ['未找到城市/省份坐标，发布后该地点可能不会显示在地图上'] }

  const coord = pickNonOverlappingCoord(base, existingLocations, `${schoolName}-${locationPayload.province}-${locationPayload.city}`)
  return {
    locationPayload: {
      ...locationPayload,
      latitude: Number(coord.lat.toFixed(6)),
      longitude: Number(coord.lng.toFixed(6)),
      geocode_status: base.geocodeStatus,
      coordinate_level: base.coordinateLevel,
    },
    warnings: base.coordinateLevel === 'province' ? ['城市坐标缺失，已使用省份坐标附近的兜底点位'] : [],
  }
}

const DUPLICATE_NAME_STOP_WORDS = [
  '学校',
  '学园',
  '学堂',
  '中心',
]

function normalizeNameForDuplicateCheck(value) {
  let text = normalizeString(value).replace(/[\\s\\p{P}\\p{S}]/gu, '')
  DUPLICATE_NAME_STOP_WORDS.forEach((word) => {
    text = text.split(word).join('')
  })
  return text
}

function significantNameChars(value) {
  return new Set(normalizeNameForDuplicateCheck(value).split('').filter(Boolean))
}

function overlapChars(a, b) {
  const aChars = significantNameChars(a)
  const bChars = significantNameChars(b)
  return Array.from(aChars).filter((char) => bChars.has(char))
}

async function findDuplicateCandidates(submission, locationPayload) {
  const name = normalizeString(submission.name)
  if (!name) return []
  let schoolIds = []

  if (locationPayload.is_online) {
    const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
      .where({ location_type: 'online' })
      .field({ school_id: true, status: true })
      .limit(1000)
      .get()
    schoolIds = (res.data || []).filter((item) => isReadableStatus(item.status)).map((item) => item.school_id)
  } else if (locationPayload.province && locationPayload.city) {
    const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
      .where({ province: locationPayload.province, city: locationPayload.city })
      .field({ school_id: true, status: true })
      .limit(1000)
      .get()
    schoolIds = (res.data || []).filter((item) => isReadableStatus(item.status)).map((item) => item.school_id)
  }

  const ids = Array.from(new Set(schoolIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (ids.length === 0) return []

  const schools = []
  for (let i = 0; i < ids.length; i += 100) {
    const res = await db.collection('schools')
      .where({ id: _.in(ids.slice(i, i + 100)) })
      .field({ id: true, name: true, canonical_name: true, aliases: true, status: true })
      .limit(100)
      .get()
    schools.push(...((res.data || []).filter((school) => isReadableStatus(school.status))))
  }

  return schools.map((school) => {
    const candidateName = normalizeString(school.canonical_name || school.name)
    const aliasText = Array.isArray(school.aliases) ? school.aliases.join('') : normalizeString(school.aliases)
    const matchedChars = Array.from(new Set([...overlapChars(name, candidateName), ...overlapChars(name, aliasText)]))
    return matchedChars.length > 0 ? {
      id: Number(school.id),
      name: candidateName || normalizeString(school.name),
      matchedChars,
    } : null
  }).filter(Boolean).slice(0, DUPLICATE_CANDIDATE_LIMIT)
}

async function getCurrentMaxSchoolId() {
  const res = await db.collection('schools')
    .field({ id: true })
    .orderBy('id', 'desc')
    .limit(1)
    .get()
  const maxId = Number((res.data || [])[0]?.id || 0)
  return Number.isFinite(maxId) && maxId > 0 ? maxId : 0
}

async function schoolIdExists(schoolId) {
  const res = await db.collection('schools').where({ id: schoolId }).field({ id: true }).limit(1).get()
  return (res.data || []).length > 0
}

async function ensureSchoolCounterSeeded() {
  try {
    const existing = await db.collection(COUNTERS_COLLECTION).doc(SCHOOL_COUNTER_DOC_ID).get()
    if (existing.data) return
  } catch (err) {
    // Missing counter doc is expected before first publish.
  }

  const maxId = await getCurrentMaxSchoolId()
  try {
    await db.collection(COUNTERS_COLLECTION).doc(SCHOOL_COUNTER_DOC_ID).set({
      data: { current: maxId, name: SCHOOL_COUNTER_DOC_ID, updatedAt: db.serverDate(), createdAt: db.serverDate() },
    })
  } catch (err) {
    console.warn('ensureSchoolCounterSeeded set skipped:', err && err.message ? err.message : err)
  }
}

async function allocateSchoolIdFromCounter() {
  await ensureSchoolCounterSeeded()

  for (let i = 0; i < SCHOOL_ID_ALLOCATION_MAX_RETRIES; i += 1) {
    await db.collection(COUNTERS_COLLECTION).doc(SCHOOL_COUNTER_DOC_ID).update({
      data: { current: _.inc(1), updatedAt: db.serverDate() },
    })

    const counterRes = await db.collection(COUNTERS_COLLECTION).doc(SCHOOL_COUNTER_DOC_ID).get()
    const candidate = Number(counterRes.data?.current || 0)
    if (!Number.isFinite(candidate) || candidate <= 0) continue
    const exists = await schoolIdExists(candidate)
    if (!exists) return candidate
  }

  throw new Error('SCHOOL_COUNTER_COLLISION_RETRIES_EXHAUSTED')
}

async function allocateSchoolIdLegacyFallback() {
  const maxId = await getCurrentMaxSchoolId()
  let candidate = maxId + 1

  for (let i = 0; i < SCHOOL_ID_ALLOCATION_MAX_RETRIES; i += 1) {
    const exists = await schoolIdExists(candidate)
    if (!exists) return candidate
    candidate += 1
  }

  const fallback = Date.now()
  console.warn('allocateSchoolId legacy exhausted sequential retries, using timestamp fallback:', fallback)
  return fallback
}

async function allocateSchoolId() {
  try {
    return await allocateSchoolIdFromCounter()
  } catch (err) {
    console.warn('allocateSchoolId counter path failed, falling back to legacy allocator:', err && err.message ? err.message : err)
    return allocateSchoolIdLegacyFallback()
  }
}

async function buildPreviewForSubmission(submission) {
  const payload = buildSchoolPublishPayload(submission)
  const geoResult = await enrichLocationPayload(payload.locationPayload, payload.schoolPayload.name)
  const locationPayload = geoResult.locationPayload
  const warnings = [...payload.warnings, ...geoResult.warnings]
  const duplicateCandidates = await findDuplicateCandidates(submission, locationPayload)
  return { ...payload, locationPayload, warnings, duplicateCandidates }
}

async function getSchoolPublishPreview(event, wxContext) {
  const requestId = resolveRequestId('school-publish-preview', event)
  const submissionId = String(event.submissionId || '').trim()
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限预览学习社区发布数据')
    const submission = await getSchoolSubmissionById(submissionId)
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', `未找到该学习社区推荐记录：${submissionId}`)
    const preview = await buildPreviewForSubmission(submission)
    return ok(requestId, { submissionId, ...preview, admin: { name: admin.name, role: admin.role } })
  } catch (err) {
    console.error('appService getSchoolPublishPreview error:', err)
    return fail(requestId, 'SCHOOL_PUBLISH_PREVIEW_FAILED', '生成学习社区发布预览失败，请稍后重试')
  }
}

async function publishSchoolDirect(event, wxContext) {
  const requestId = resolveRequestId('publish-school-direct', event)
  const submissionId = String(event.submissionId || '').trim()
  const adminNote = String(event.adminNote || '').trim()
  const duplicateResolution = String(event.duplicateResolution || '').trim()
  const mergeSchoolId = Number(event.mergeSchoolId || 0)
  if (!submissionId) return fail(requestId, 'SUBMISSION_ID_REQUIRED', '缺少 submissionId')

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限发布学习社区')

    const submission = await getSchoolSubmissionById(submissionId)
    if (!submission) return fail(requestId, 'SUBMISSION_NOT_FOUND', `未找到该学习社区推荐记录：${submissionId}`)

    if (submission.status === 'merged' && submission.publishedSchoolId) {
      return ok(requestId, { message: '该学习社区已发布，无需重复发布', nextStatus: 'merged', publishedSchoolId: Number(submission.publishedSchoolId) })
    }

    const existingPublished = await db.collection('schools').where({ source_submission_id: submissionId }).limit(1).get()
    if ((existingPublished.data || []).length > 0) {
      const existing = existingPublished.data[0]
      const existingId = Number(existing.id || existing._id)
      await db.collection('school_submissions').doc(submissionId).update({
        data: { status: 'merged', publishedSchoolId: existingId, publishedAt: db.serverDate(), reviewedAt: db.serverDate(), reviewedBy: String(admin.name || '').trim() || 'admin', adminNote: adminNote || '已发布到 schools', updatedAt: db.serverDate() },
      })
      return ok(requestId, { message: '该提交已存在对应学习社区，已同步审核状态', nextStatus: 'merged', publishedSchoolId: existingId, school: existing })
    }

    const preview = await buildPreviewForSubmission(submission)
    if (preview.duplicateCandidates.length > 0 && duplicateResolution !== 'continue' && duplicateResolution !== 'merge') {
      return fail(requestId, 'DUPLICATE_CANDIDATES', '同一位置存在名称有重合的学习社区，请人工验证后选择继续发布或合并。', {
        duplicateCandidates: preview.duplicateCandidates,
        schoolPayload: preview.schoolPayload,
        locationPayload: preview.locationPayload,
        warnings: preview.warnings,
      })
    }

    const reviewerName = String(admin.name || '').trim() || 'admin'

    if (duplicateResolution === 'merge') {
      if (!Number.isFinite(mergeSchoolId) || mergeSchoolId <= 0) return fail(requestId, 'MERGE_SCHOOL_ID_REQUIRED', '请选择要合并到的学习社区')
      const schoolRes = await db.collection('schools').where({ id: mergeSchoolId }).limit(1).get()
      const targetSchool = (schoolRes.data || []).find((school) => isReadableStatus(school.status))
      if (!targetSchool) return fail(requestId, 'MERGE_TARGET_NOT_FOUND', '未找到要合并的学习社区')

      let addedLocation = false
      const existingLocations = await getLocationsBySchoolIds([mergeSchoolId])
      const hasSameLocation = existingLocations.some((location) =>
        normalizeString(location.province) === preview.locationPayload.province &&
        normalizeString(location.city) === preview.locationPayload.city &&
        normalizeString(location.location_type || 'offline') === preview.locationPayload.location_type
      )

      if (!hasSameLocation) {
        await db.collection(SCHOOL_LOCATION_COLLECTION).add({
          data: {
            ...preview.locationPayload,
            school_id: mergeSchoolId,
            source_submission_id: submissionId,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })
        addedLocation = true
      }

      await db.collection('schools').doc(targetSchool._id).update({ data: { updatedAt: db.serverDate() } })
      await db.collection('school_submissions').doc(submissionId).update({
        data: { status: 'merged', publishedSchoolId: mergeSchoolId, publishedAt: db.serverDate(), reviewedAt: db.serverDate(), reviewedBy: reviewerName, adminNote: adminNote || `已合并到学习社区 #${mergeSchoolId}`, updatedAt: db.serverDate() },
      })

      await writeAdminAuditLog({
        admin,
        openid: wxContext.OPENID,
        action: 'school_submission_merged_directly',
        targetType: 'school_submission',
        targetId: submissionId,
        metadata: { name: submission.name || '', nextStatus: 'merged', publishedSchoolId: mergeSchoolId, addedLocation, duplicateCandidates: preview.duplicateCandidates, warnings: preview.warnings, adminNote: adminNote || `已合并到学习社区 #${mergeSchoolId}` },
      })

      return ok(requestId, { message: addedLocation ? '已合并并新增地点' : '已合并到已有学习社区', nextStatus: 'merged', publishedSchoolId: mergeSchoolId, duplicateCandidates: preview.duplicateCandidates, warnings: preview.warnings })
    }

    const publishedSchoolId = await allocateSchoolId()
    const schoolDoc = {
      ...preview.schoolPayload,
      id: publishedSchoolId,
      source_submission_id: submissionId,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
    const locationDoc = {
      ...preview.locationPayload,
      school_id: publishedSchoolId,
      source_submission_id: submissionId,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }

    await db.collection('schools').add({ data: schoolDoc })
    await db.collection(SCHOOL_LOCATION_COLLECTION).add({ data: locationDoc })
    await db.collection('school_submissions').doc(submissionId).update({
      data: { status: 'merged', publishedSchoolId, publishedAt: db.serverDate(), reviewedAt: db.serverDate(), reviewedBy: reviewerName, adminNote: adminNote || '已发布到 schools', updatedAt: db.serverDate() },
    })

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'school_submission_published_directly',
      targetType: 'school_submission',
      targetId: submissionId,
      metadata: { name: submission.name || '', previousStatus: submission.status || 'pending', nextStatus: 'merged', publishedSchoolId, duplicateResolution: duplicateResolution || 'none', duplicateCandidates: preview.duplicateCandidates, warnings: preview.warnings, adminNote: adminNote || '已发布到 schools' },
    })

    return ok(requestId, { message: '已一键发布到学习社区库', nextStatus: 'merged', publishedSchoolId, school: schoolDoc, location: locationDoc, duplicateCandidates: preview.duplicateCandidates, warnings: preview.warnings })
  } catch (err) {
    console.error('appService publishSchoolDirect error:', err)
    return fail(requestId, 'PUBLISH_SCHOOL_DIRECT_FAILED', '一键发布学习社区失败，请稍后重试')
  }
}

async function hidePublishedSchool(event, wxContext) {
  const requestId = resolveRequestId('hide-published-school', event)
  const schoolId = Number(event.schoolId || 0)
  const adminNote = String(event.adminNote || '').trim()
  if (!Number.isFinite(schoolId) || schoolId <= 0) return fail(requestId, 'SCHOOL_ID_REQUIRED', '缺少 schoolId')

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限下架学习社区')

    const schoolRes = await db.collection('schools').where({ id: schoolId }).limit(1).get()
    const school = (schoolRes.data || [])[0]
    if (!school) return fail(requestId, 'SCHOOL_NOT_FOUND', '未找到该学习社区')

    await db.collection('schools').doc(school._id).update({
      data: { status: 'hidden', hiddenAt: db.serverDate(), hiddenBy: String(admin.name || '').trim() || 'admin', hiddenNote: adminNote, updatedAt: db.serverDate() },
    })

    const locations = await getLocationsBySchoolIds([schoolId])
    await Promise.all(locations.map((location) => db.collection(SCHOOL_LOCATION_COLLECTION).doc(location._id).update({
      data: { status: 'hidden', hiddenAt: db.serverDate(), hiddenBy: String(admin.name || '').trim() || 'admin', updatedAt: db.serverDate() },
    }).catch((err) => console.warn('hide school location skipped:', err && err.message ? err.message : err))))

    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'school_hidden',
      targetType: 'school',
      targetId: String(schoolId),
      metadata: { name: school.name || school.canonical_name || '', adminNote },
    })

    return ok(requestId, { message: '已下架/隐藏学习社区', schoolId })
  } catch (err) {
    console.error('appService hidePublishedSchool error:', err)
    return fail(requestId, 'HIDE_SCHOOL_FAILED', '下架学习社区失败，请稍后重试')
  }
}

module.exports = {
  getSchoolPublishPreview,
  publishSchoolDirect,
  hidePublishedSchool,
}
