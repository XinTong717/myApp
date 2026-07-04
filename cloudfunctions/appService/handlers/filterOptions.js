const { db } = require('../lib/cloud')
const { ok, resolveRequestId } = require('../lib/response')

const EVENT_FILTER_OPTIONS = {
  eventTypes: ['全部', '工作坊', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他'],
  audience: ['全部', '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '其他'],
  fee: ['全部', '免费', '付费', '公益随喜', '费用待确认'],
  status: ['全部', 'recruiting', 'recurring', 'ended'],
  eventTypeValueMap: {
    工作坊: 'workshop',
    项目招募: 'community_program',
    圆桌讨论: 'discussion',
    交友聚会: 'meetup',
    一对一: 'one_on_one',
    团体: 'group',
  },
}

const SCHOOL_FILTER_OPTIONS = {
  allOption: '全部',
  listLimit: 100,
  maxDynamicOptions: 80,
  provinces: [],
  provinceStats: [],
  schoolTypes: [],
  ageRanges: [],
}

const SCHOOL_FILTER_SCAN_LIMIT = 1000
const DELETED_STATUSES = new Set(['deleted', 'removed', 'archived'])

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase()
}

function isReadableStatus(value) {
  const status = normalizeStatus(value)
  return !status || !DELETED_STATUSES.has(status)
}

function splitLabels(value) {
  return normalizeString(value)
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueSorted(values) {
  return Array.from(new Set((values || []).map(normalizeString).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function buildProvinceStats(items) {
  const provinceMap = new Map()
  ;(items || []).forEach((item, index) => {
    const schoolId = normalizeString(item.school_id || item.schoolId || item.id || '')
    splitLabels(item.province).forEach((province) => {
      if (!provinceMap.has(province)) provinceMap.set(province, new Set())
      provinceMap.get(province).add(schoolId || `location-${index}`)
    })
  })

  return Array.from(provinceMap.entries())
    .map(([province, schoolIds]) => ({ province, count: schoolIds.size }))
    .sort((a, b) => b.count - a.count || a.province.localeCompare(b.province, 'zh-CN'))
}

async function buildSchoolFilterOptions() {
  try {
    const [locationsRes, schoolsRes] = await Promise.all([
      db.collection('school_locations')
        .field({ school_id: true, province: true, city: true, status: true })
        .limit(SCHOOL_FILTER_SCAN_LIMIT)
        .get(),
      db.collection('schools')
        .field({ id: true, province: true, city: true, school_type: true, age_range: true, status: true })
        .limit(SCHOOL_FILTER_SCAN_LIMIT)
        .get(),
    ])

    const readableLocations = (locationsRes.data || []).filter((item) => isReadableStatus(item.status))
    const readableSchools = (schoolsRes.data || []).filter((item) => isReadableStatus(item.status))
    const legacySchoolLocations = readableSchools
      .filter((item) => normalizeString(item.province))
      .map((item) => ({ id: item.id, province: item.province, city: item.city, status: item.status }))
    const provinceStats = buildProvinceStats([...readableLocations, ...legacySchoolLocations])

    return {
      ...SCHOOL_FILTER_OPTIONS,
      provinces: provinceStats.length > 0 ? provinceStats.map((item) => item.province) : uniqueSorted([...readableLocations, ...legacySchoolLocations].map((item) => item.province)),
      provinceStats,
      schoolTypes: uniqueSorted(readableSchools.flatMap((item) => splitLabels(item.school_type))),
      ageRanges: uniqueSorted(readableSchools.flatMap((item) => splitLabels(item.age_range))),
    }
  } catch (err) {
    console.warn('buildSchoolFilterOptions degraded:', err && err.message ? err.message : err)
    return SCHOOL_FILTER_OPTIONS
  }
}

async function getFilterOptions(event) {
  const requestId = resolveRequestId('filter-options', event)
  return ok(requestId, {
    event: EVENT_FILTER_OPTIONS,
    school: await buildSchoolFilterOptions(),
  })
}

module.exports = {
  getFilterOptions,
}
