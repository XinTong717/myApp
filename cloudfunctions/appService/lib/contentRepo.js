const { db, _ } = require('./cloud')

const SCHOOL_LIST_DEFAULT_LIMIT = 80
const SCHOOL_LIST_MAX_LIMIT = 200
const EVENT_LIST_LIMIT = 50
const SCHOOL_LOCATION_COLLECTION = 'school_locations'
const DELETED_STATUSES = new Set(['deleted', 'removed', 'archived'])

function normalizeLimit(value, fallback, max) {
  return Math.min(Math.max(Number(value || fallback), 1), max)
}

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
    .split(/[、,，/|｜]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueLabels(values) {
  return Array.from(new Set((values || []).map((item) => normalizeString(item)).filter((item) => item && item !== '全部')))
}

function normalizeFilterList(...values) {
  return uniqueLabels(values.flatMap((value) => {
    if (Array.isArray(value)) return value.flatMap((item) => splitLabels(item))
    return splitLabels(value)
  }))
}

function uniqueNumbers(values) {
  return Array.from(new Set((values || []).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)))
}

function escapeRegExp(value) {
  return normalizeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsRegExp(value) {
  const escaped = escapeRegExp(value)
  if (!escaped) return null
  return db.RegExp({ regexp: escaped, options: 'i' })
}

function isFinitePositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

function getCanonicalName(school) {
  return normalizeString(school.canonical_name || school.name || school.title)
}

function matchesAnyText(value, filters) {
  if (!filters || filters.length === 0) return true
  const text = normalizeString(value)
  const tokens = splitLabels(value)
  return filters.some((filter) => tokens.includes(filter) || text.includes(filter))
}

function getLocationFilters(options = {}) {
  return {
    provinces: normalizeFilterList(options.province, options.provinces),
    cities: normalizeFilterList(options.city, options.cities),
  }
}

function hasLocationFilters(options = {}) {
  const filters = getLocationFilters(options)
  return filters.provinces.length > 0 || filters.cities.length > 0
}

function buildSchoolWhere(options = {}) {
  const where = {}
  const schoolTypes = normalizeFilterList(options.schoolType || options.type, options.schoolTypes || options.types)
  const ageRanges = normalizeFilterList(options.ageRange, options.ageRanges)
  const schoolIds = uniqueNumbers(options.schoolIds || [])

  if (schoolIds.length > 0) where.id = _.in(schoolIds)
  if (schoolTypes.length === 1) where.school_type = containsRegExp(schoolTypes[0])
  if (ageRanges.length === 1) where.age_range = containsRegExp(ageRanges[0])

  return where
}

function fallbackLocationsFromSchool(school) {
  const cities = splitLabels(school.city)
  const provinces = splitLabels(school.province)
  const schoolId = Number(school.id)

  if (cities.length > 0) {
    return cities.map((city, index) => ({
      school_id: schoolId,
      province: provinces[index] || provinces[0] || '',
      city,
      address_note: '',
      contact_note: '',
      status: 'published',
      source: 'legacy_schools_city',
    }))
  }

  if (provinces.length > 0) {
    return provinces.map((province) => ({
      school_id: schoolId,
      province,
      city: '',
      address_note: '',
      contact_note: '',
      status: 'published',
      source: 'legacy_schools_province',
    }))
  }

  return []
}

async function listSchoolLocationsByIds(schoolIds) {
  const ids = uniqueNumbers(schoolIds)
  if (ids.length === 0) return []

  try {
    const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
      .where({ school_id: _.in(ids) })
      .field({
        school_id: true,
        province: true,
        city: true,
        address_note: true,
        contact_note: true,
        status: true,
        source: true,
      })
      .limit(SCHOOL_LIST_MAX_LIMIT * 3)
      .get()

    return (res.data || []).filter((item) => isReadableStatus(item.status))
  } catch (err) {
    console.warn('school_locations read failed:', err && err.message ? err.message : err)
    return []
  }
}

async function listSchoolIdsByLocation(options = {}) {
  const { provinces, cities } = getLocationFilters(options)
  if (provinces.length === 0 && cities.length === 0) return null

  try {
    const where = {}
    if (provinces.length === 1) where.province = provinces[0]
    if (provinces.length > 1) where.province = _.in(provinces)
    if (cities.length === 1) where.city = cities[0]
    if (cities.length > 1) where.city = _.in(cities)

    const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
      .where(where)
      .field({ school_id: true, status: true })
      .limit(SCHOOL_LIST_MAX_LIMIT * 3)
      .get()

    return uniqueNumbers((res.data || []).filter((item) => isReadableStatus(item.status)).map((item) => item.school_id)).slice(0, SCHOOL_LIST_MAX_LIMIT)
  } catch (err) {
    console.warn('school_locations filter failed:', err && err.message ? err.message : err)
    return []
  }
}

function attachSchoolLocations(schools, locations, options = {}) {
  const allowLegacyFallback = options.allowLegacyFallback === true
  const locationMap = new Map()
  if (Array.isArray(locations)) {
    locations.forEach((location) => {
      const schoolId = Number(location.school_id)
      if (!schoolId) return
      if (!locationMap.has(schoolId)) locationMap.set(schoolId, [])
      locationMap.get(schoolId).push({
        school_id: schoolId,
        province: normalizeString(location.province),
        city: normalizeString(location.city),
        address_note: normalizeString(location.address_note),
        contact_note: normalizeString(location.contact_note),
        status: normalizeString(location.status || 'published'),
        source: normalizeString(location.source),
      })
    })
  }

  return (schools || []).filter((school) => isReadableStatus(school.status)).map((school) => {
    const schoolId = Number(school.id)
    const normalizedLocations = locationMap.get(schoolId) || (allowLegacyFallback ? fallbackLocationsFromSchool(school) : [])
    const provinces = uniqueLabels(normalizedLocations.map((item) => item.province))
    const cities = uniqueLabels(normalizedLocations.map((item) => item.city))

    return {
      ...school,
      name: getCanonicalName(school),
      canonical_name: getCanonicalName(school),
      description: normalizeString(school.description),
      province: provinces.join(','),
      city: cities.join(','),
      locations: normalizedLocations,
      location_count: normalizedLocations.length,
    }
  })
}

function filterSchoolsByLocation(schools, options = {}) {
  const { provinces, cities } = getLocationFilters(options)
  if (provinces.length === 0 && cities.length === 0) return schools

  return schools.filter((school) => {
    const locations = Array.isArray(school.locations) ? school.locations : []
    return locations.some((location) => {
      if (provinces.length > 0 && !provinces.includes(location.province)) return false
      if (cities.length > 0 && !cities.includes(location.city)) return false
      return true
    })
  })
}

function filterSchoolsByFacets(schools, options = {}) {
  const schoolTypes = normalizeFilterList(options.schoolType || options.type, options.schoolTypes || options.types)
  const ageRanges = normalizeFilterList(options.ageRange, options.ageRanges)
  if (schoolTypes.length === 0 && ageRanges.length === 0) return schools

  return schools.filter((school) => {
    if (!matchesAnyText(school.school_type, schoolTypes)) return false
    if (!matchesAnyText(school.age_range, ageRanges)) return false
    return true
  })
}

async function listSchools(options = {}) {
  const normalizedOptions = typeof options === 'object' && options !== null ? options : { limit: options }
  const limit = normalizeLimit(normalizedOptions.limit, SCHOOL_LIST_DEFAULT_LIMIT, SCHOOL_LIST_MAX_LIMIT)
  const locationSchoolIds = await listSchoolIdsByLocation(normalizedOptions)
  const hasLocationFilter = hasLocationFilters(normalizedOptions)

  if (hasLocationFilter && (!Array.isArray(locationSchoolIds) || locationSchoolIds.length === 0)) return []

  const queryOptions = Array.isArray(locationSchoolIds) && locationSchoolIds.length > 0
    ? { ...normalizedOptions, schoolIds: locationSchoolIds }
    : normalizedOptions

  const hasMultiFacetFilter =
    normalizeFilterList(queryOptions.schoolType || queryOptions.type, queryOptions.schoolTypes || queryOptions.types).length > 1 ||
    normalizeFilterList(queryOptions.ageRange, queryOptions.ageRanges).length > 1

  const queryLimit = Array.isArray(locationSchoolIds) && locationSchoolIds.length > 0
    ? Math.min(Math.max(locationSchoolIds.length, 1), SCHOOL_LIST_MAX_LIMIT)
    : hasMultiFacetFilter
      ? SCHOOL_LIST_MAX_LIMIT
      : limit

  const res = await db.collection('schools')
    .where(buildSchoolWhere(queryOptions))
    .field({
      id: true,
      name: true,
      canonical_name: true,
      description: true,
      province: true,
      city: true,
      age_range: true,
      school_type: true,
      fee: true,
      has_xuji: true,
      official_url: true,
      status: true,
    })
    .orderBy('id', 'asc')
    .limit(queryLimit)
    .get()

  const rawSchools = (res.data || []).filter((school) => isReadableStatus(school.status))
  const locations = await listSchoolLocationsByIds(rawSchools.map((school) => school.id))
  const schoolsWithLocations = attachSchoolLocations(rawSchools, locations, { allowLegacyFallback: false })

  return filterSchoolsByFacets(filterSchoolsByLocation(schoolsWithLocations, normalizedOptions), normalizedOptions).slice(0, limit)
}

async function getSchoolById(schoolId) {
  if (!isFinitePositiveNumber(schoolId)) return null

  const res = await db.collection('schools')
    .where({ id: Number(schoolId) })
    .limit(1)
    .get()

  const school = (res.data || []).find((item) => isReadableStatus(item.status)) || null
  if (!school) return null

  const locations = await listSchoolLocationsByIds([Number(schoolId)])
  return attachSchoolLocations([school], locations, { allowLegacyFallback: true })[0] || null
}

async function listEvents(limit = EVENT_LIST_LIMIT) {
  const queryLimit = normalizeLimit(limit, EVENT_LIST_LIMIT, EVENT_LIST_LIMIT)
  const res = await db.collection('events')
    .field({
      id: true,
      title: true,
      event_type: true,
      description: true,
      start_time: true,
      end_time: true,
      location: true,
      fee: true,
      status: true,
      organizer: true,
      is_online: true,
    })
    .orderBy('start_time', 'asc')
    .limit(queryLimit)
    .get()

  return (res.data || []).filter((event) => isReadableStatus(event.status)).slice(0, queryLimit)
}

async function getEventById(eventId) {
  if (!isFinitePositiveNumber(eventId)) return null

  const res = await db.collection('events')
    .where({ id: Number(eventId) })
    .limit(1)
    .get()

  return (res.data || []).find((event) => isReadableStatus(event.status)) || null
}

module.exports = {
  SCHOOL_LIST_DEFAULT_LIMIT,
  SCHOOL_LIST_MAX_LIMIT,
  EVENT_LIST_LIMIT,
  SCHOOL_LOCATION_COLLECTION,
  listSchools,
  getSchoolById,
  listEvents,
  getEventById,
}
