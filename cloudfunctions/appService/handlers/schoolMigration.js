const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')

const SCHOOL_LOCATION_COLLECTION = 'school_locations'
const MIGRATION_SOURCE = 'legacy_schools_city_migration'
const DEFAULT_DRY_RUN_LIMIT = 300
const DEFAULT_WRITE_LIMIT = 40
const MAX_DRY_RUN_LIMIT = 500
const MAX_WRITE_LIMIT = 80
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
    .split(/[、,，/|｜]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function stableLocationId(schoolId, province, city) {
  const raw = `${Number(schoolId) || 0}:${normalizeString(province)}:${normalizeString(city)}`
  const encoded = Buffer.from(raw).toString('base64url').slice(0, 80)
  return `school_location_${encoded}`
}

function buildLocationsForSchool(school) {
  const schoolId = Number(school.id)
  const provinces = splitLabels(school.province)
  const cities = splitLabels(school.city)

  if (!schoolId) return []

  if (cities.length > 0) {
    return cities.map((city, index) => {
      const province = provinces[index] || provinces[0] || ''
      return {
        _id: stableLocationId(schoolId, province, city),
        school_id: schoolId,
        school_doc_id: school._id || '',
        school_name: normalizeString(school.canonical_name || school.name),
        province,
        city,
        address_note: '',
        contact_note: '',
        status: 'published',
        source: MIGRATION_SOURCE,
      }
    })
  }

  if (provinces.length > 0) {
    return provinces.map((province) => ({
      _id: stableLocationId(schoolId, province, ''),
      school_id: schoolId,
      school_doc_id: school._id || '',
      school_name: normalizeString(school.canonical_name || school.name),
      province,
      city: '',
      address_note: '',
      contact_note: '',
      status: 'published',
      source: MIGRATION_SOURCE,
    }))
  }

  return []
}

async function listLegacySchools(limit, startAfterId = 0) {
  const where = { status: _.neq('deleted') }
  if (Number(startAfterId) > 0) where.id = _.gt(Number(startAfterId))

  const res = await db.collection('schools')
    .where(where)
    .field({ id: true, name: true, canonical_name: true, province: true, city: true, status: true })
    .orderBy('id', 'asc')
    .limit(limit)
    .get()

  return (res.data || []).filter((school) => isReadableStatus(school.status))
}

async function upsertLocation(location) {
  const { _id, ...data } = location
  try {
    await db.collection(SCHOOL_LOCATION_COLLECTION).doc(_id).set({
      data: {
        ...data,
        updatedAt: db.serverDate(),
      },
    })
    return { ok: true, _id }
  } catch (err) {
    return { ok: false, _id, message: err && err.message ? err.message : String(err) }
  }
}

async function listActualLocationsBySchoolIds(schoolIds) {
  const ids = Array.from(new Set((schoolIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (ids.length === 0) return []

  const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
    .where({ school_id: _.in(ids) })
    .field({ school_id: true, province: true, city: true, status: true, source: true })
    .limit(MAX_DRY_RUN_LIMIT * 3)
    .get()

  return (res.data || []).filter((location) => isReadableStatus(location.status))
}

function makeLocationKey(location) {
  return stableLocationId(location.school_id, location.province, location.city)
}

async function migrateSchoolLocations(event, wxContext) {
  const requestId = resolveRequestId('migrate-school-locations', event)
  const dryRun = event.dryRun !== false
  const requestedLimit = Math.min(Math.max(Number(event.limit || (dryRun ? DEFAULT_DRY_RUN_LIMIT : DEFAULT_WRITE_LIMIT)), 1), dryRun ? MAX_DRY_RUN_LIMIT : MAX_WRITE_LIMIT)
  const startAfterId = Math.max(Number(event.startAfterId || 0), 0)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限执行学校地点迁移')

    const schools = await listLegacySchools(requestedLimit, startAfterId)
    const locations = schools.flatMap((school) => buildLocationsForSchool(school))
    const lastSchoolId = schools.length > 0 ? Number(schools[schools.length - 1].id || 0) : startAfterId
    const hasMore = schools.length === requestedLimit

    if (dryRun) {
      return ok(requestId, {
        dryRun: true,
        startAfterId,
        nextStartAfterId: lastSchoolId,
        hasMore,
        schoolCount: schools.length,
        locationCount: locations.length,
        sample: locations.slice(0, 10),
      })
    }

    const results = await Promise.all(locations.map((location) => upsertLocation(location)))
    const failed = results.filter((item) => !item.ok)
    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'school_locations_migrated',
      targetType: 'school_locations',
      targetId: `legacy_schools_city_after_${startAfterId}`,
      metadata: {
        startAfterId,
        nextStartAfterId: lastSchoolId,
        hasMore,
        schoolCount: schools.length,
        locationCount: locations.length,
        successCount: results.length - failed.length,
        failedCount: failed.length,
      },
    })

    return ok(requestId, {
      dryRun: false,
      startAfterId,
      nextStartAfterId: lastSchoolId,
      hasMore,
      schoolCount: schools.length,
      locationCount: locations.length,
      successCount: results.length - failed.length,
      failedCount: failed.length,
      failed: failed.slice(0, 20),
      message: hasMore ? `本批迁移完成，请继续用 startAfterId=${lastSchoolId} 跑下一批` : '学校地点迁移完成',
    })
  } catch (err) {
    console.error('appService migrateSchoolLocations error:', err)
    return fail(requestId, 'MIGRATE_SCHOOL_LOCATIONS_FAILED', '迁移 school_locations 失败，请稍后重试')
  }
}

async function validateSchoolLocationsMigration(event, wxContext) {
  const requestId = resolveRequestId('validate-school-locations', event)
  const limit = Math.min(Math.max(Number(event.limit || MAX_DRY_RUN_LIMIT), 1), MAX_DRY_RUN_LIMIT)
  const startAfterId = Math.max(Number(event.startAfterId || 0), 0)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限校验学校地点迁移')

    const schools = await listLegacySchools(limit, startAfterId)
    const expectedLocations = schools.flatMap((school) => buildLocationsForSchool(school))
    const actualLocations = await listActualLocationsBySchoolIds(schools.map((school) => school.id))
    const actualKeys = new Set(actualLocations.map((location) => makeLocationKey(location)))
    const expectedKeys = new Set(expectedLocations.map((location) => location._id))

    const missing = expectedLocations.filter((location) => !actualKeys.has(location._id))
    const extra = actualLocations.filter((location) => !expectedKeys.has(makeLocationKey(location)))
    const lastSchoolId = schools.length > 0 ? Number(schools[schools.length - 1].id || 0) : startAfterId
    const hasMore = schools.length === limit

    return ok(requestId, {
      startAfterId,
      nextStartAfterId: lastSchoolId,
      hasMore,
      schoolCount: schools.length,
      expectedLocationCount: expectedLocations.length,
      actualLocationCount: actualLocations.length,
      missingCount: missing.length,
      extraCount: extra.length,
      readyForStrictLocations: missing.length === 0,
      missing: missing.slice(0, 20),
      extra: extra.slice(0, 20),
      message: missing.length === 0
        ? '当前批次 school_locations 已覆盖 legacy 地点，可以进入严格读取阶段'
        : '还有地点未迁移，请先补跑 migrateSchoolLocations',
    })
  } catch (err) {
    console.error('appService validateSchoolLocationsMigration error:', err)
    return fail(requestId, 'VALIDATE_SCHOOL_LOCATIONS_FAILED', '校验 school_locations 迁移失败，请稍后重试')
  }
}

module.exports = {
  migrateSchoolLocations,
  validateSchoolLocationsMigration,
}
