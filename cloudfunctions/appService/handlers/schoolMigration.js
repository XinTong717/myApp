const { db, _ } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')

const SCHOOL_LOCATION_COLLECTION = 'school_locations'
const MIGRATION_SOURCE = 'legacy_schools_city_migration'
const DEFAULT_LIMIT = 300

function normalizeString(value) {
  return String(value || '').trim()
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

async function listLegacySchools(limit) {
  const res = await db.collection('schools')
    .where({ status: _.neq('deleted') })
    .field({ id: true, name: true, canonical_name: true, province: true, city: true, status: true })
    .orderBy('id', 'asc')
    .limit(limit)
    .get()

  return res.data || []
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

async function migrateSchoolLocations(event, wxContext) {
  const requestId = resolveRequestId('migrate-school-locations', event)
  const dryRun = event.dryRun !== false
  const limit = Math.min(Math.max(Number(event.limit || DEFAULT_LIMIT), 1), 500)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限执行学校地点迁移')

    const schools = await listLegacySchools(limit)
    const locations = schools.flatMap((school) => buildLocationsForSchool(school))

    if (dryRun) {
      return ok(requestId, {
        dryRun: true,
        schoolCount: schools.length,
        locationCount: locations.length,
        sample: locations.slice(0, 10),
      })
    }

    const results = []
    for (const location of locations) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await upsertLocation(location))
    }

    const failed = results.filter((item) => !item.ok)
    await writeAdminAuditLog({
      admin,
      openid: wxContext.OPENID,
      action: 'school_locations_migrated',
      targetType: 'school_locations',
      targetId: 'legacy_schools_city',
      metadata: {
        schoolCount: schools.length,
        locationCount: locations.length,
        successCount: results.length - failed.length,
        failedCount: failed.length,
      },
    })

    return ok(requestId, {
      dryRun: false,
      schoolCount: schools.length,
      locationCount: locations.length,
      successCount: results.length - failed.length,
      failedCount: failed.length,
      failed: failed.slice(0, 20),
    })
  } catch (err) {
    console.error('appService migrateSchoolLocations error:', err)
    return fail(requestId, 'MIGRATE_SCHOOL_LOCATIONS_FAILED', '迁移 school_locations 失败，请稍后重试')
  }
}

module.exports = {
  migrateSchoolLocations,
}
