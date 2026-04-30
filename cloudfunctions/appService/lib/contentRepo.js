const { db, _ } = require('./cloud')

const SCHOOL_LIST_DEFAULT_LIMIT = 80
const SCHOOL_LIST_MAX_LIMIT = 200
const EVENT_LIST_LIMIT = 50
const SCHOOL_LOCATION_COLLECTION = 'school_locations'

function normalizeLimit(value, fallback, max) {
  return Math.min(Math.max(Number(value || fallback), 1), max)
}

function normalizeString(value) {
  return String(value || '').trim()
}

function splitLabels(value) {
  return normalizeString(value)
    .split(/[、,，/|｜]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueLabels(values) {
  return Array.from(new Set((values || []).map((item) => normalizeString(item)).filter(Boolean)))
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

function buildSchoolWhere(options = {}) {
  const where = { status: _.neq('deleted') }
  const schoolType = normalizeString(options.schoolType || options.type)
  const ageRange = normalizeString(options.ageRange)

  if (schoolType) where.school_type = containsRegExp(schoolType)
  if (ageRange) where.age_range = containsRegExp(ageRange)

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
  const ids = uniqueLabels(schoolIds.map((id) => String(Number(id))).filter((id) => Number(id) > 0)).map(Number)
  if (ids.length === 0) return null

  try {
    const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
      .where({ school_id: _.in(ids), status: _.neq('deleted') })
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

    return res.data || []
  } catch (err) {
    console.warn('school_locations read skipped, using legacy fields:', err && err.message ? err.message : err)
    return null
  }
}

function attachSchoolLocations(schools, locations) {
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

  return (schools || []).map((school) => {
    const schoolId = Number(school.id)
    const normalizedLocations = locationMap.get(schoolId) || fallbackLocationsFromSchool(school)
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
  const province = normalizeString(options.province)
  const city = normalizeString(options.city)
  if (!province && !city) return schools

  return schools.filter((school) => {
    const locations = Array.isArray(school.locations) ? school.locations : []
    return locations.some((location) => {
      if (province && location.province !== province) return false
      if (city && location.city !== city) return false
      return true
    })
  })
}

async function listSchools(options = {}) {
  const normalizedOptions = typeof options === 'object' && options !== null ? options : { limit: options }
  const limit = normalizeLimit(normalizedOptions.limit, SCHOOL_LIST_DEFAULT_LIMIT, SCHOOL_LIST_MAX_LIMIT)
  const queryLimit = normalizeString(normalizedOptions.province || normalizedOptions.city)
    ? SCHOOL_LIST_MAX_LIMIT
    : limit

  const res = await db.collection('schools')
    .where(buildSchoolWhere(normalizedOptions))
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
    })
    .orderBy('id', 'asc')
    .limit(queryLimit)
    .get()

  const rawSchools = res.data || []
  const locations = await listSchoolLocationsByIds(rawSchools.map((school) => school.id))
  const schoolsWithLocations = attachSchoolLocations(rawSchools, locations)

  return filterSchoolsByLocation(schoolsWithLocations, normalizedOptions).slice(0, limit)
}

async function getSchoolById(schoolId) {
  if (!isFinitePositiveNumber(schoolId)) return null

  const res = await db.collection('schools')
    .where({ id: Number(schoolId), status: _.neq('deleted') })
    .limit(1)
    .get()

  const school = res.data?.[0] || null
  if (!school) return null

  const locations = await listSchoolLocationsByIds([Number(schoolId)])
  return attachSchoolLocations([school], locations)[0] || null
}

async function listEvents(limit = EVENT_LIST_LIMIT) {
  const res = await db.collection('events')
    .where({ status: _.neq('deleted') })
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
    .limit(normalizeLimit(limit, EVENT_LIST_LIMIT, EVENT_LIST_LIMIT))
    .get()

  return res.data || []
}

async function getEventById(eventId) {
  if (!isFinitePositiveNumber(eventId)) return null

  const res = await db.collection('events')
    .where({ id: Number(eventId), status: _.neq('deleted') })
    .limit(1)
    .get()

  return res.data?.[0] || null
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
