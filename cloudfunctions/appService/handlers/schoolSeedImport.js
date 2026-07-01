const { db } = require('../lib/cloud')
const { ok, fail, resolveRequestId } = require('../lib/response')
const { getActiveAdmin } = require('../lib/userRepo')
const { writeAdminAuditLog } = require('../lib/adminAudit')
const { TAIHUA_SCHOOL_IMPORT_2026_06 } = require('../data/taihuaSchoolImport202606')

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 300
const MAX_EXISTING_SCHOOLS = 1000
const SCHOOL_LOCATION_COLLECTION = 'school_locations'
const FILL_EMPTY = 'fill_empty'
const OVERWRITE = 'overwrite_seed_fields'
const IMPORT_ID = 'taihua_school_import_2026_06'

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeNumber(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function normalizeName(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[🔥🌵\s\-·•、,，/|｜【】\[\]（）()<>〈〉《》:：;；!！?？.。]/g, '')
    .replace(/公众号$/g, '')
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).map(normalizeString).filter(Boolean)))
}

function splitLabels(value) {
  if (Array.isArray(value)) return value.map(normalizeString).filter(Boolean)
  return normalizeString(value).split(/[、,，/|｜]+/).map(normalizeString).filter(Boolean)
}

function compact(value, maxLength) {
  const text = normalizeString(value)
  return maxLength && text.length > maxLength ? text.slice(0, maxLength) : text
}

function stableLocationId(schoolId, province, city) {
  const raw = `${normalizeNumber(schoolId)}:${normalizeString(province)}:${normalizeString(city)}`
  return `school_location_${Buffer.from(raw).toString('base64url').slice(0, 80)}`
}

function normalizeLocation(location, seed) {
  return {
    province: normalizeString(location.province),
    city: normalizeString(location.city),
    addressNote: normalizeString(location.addressNote || location.address_note),
    contactNote: normalizeString(location.contactNote || location.contact_note),
    status: normalizeString(location.status || seed.status || 'published'),
    source: normalizeString(location.source || seed.source || IMPORT_ID),
  }
}

function normalizeSeed(seed, options = {}) {
  const canonicalName = normalizeString(seed.canonicalName || seed.canonical_name || seed.name)
  const isScreenshotOnly = seed.source === 'taihua_screenshot_2026_06'
  const status = isScreenshotOnly && !options.publishScreenshotOnly ? 'draft' : normalizeString(seed.status || 'published')
  return {
    ...seed,
    canonicalName,
    aliases: uniqueStrings(seed.aliases || []),
    locations: Array.isArray(seed.locations)
      ? seed.locations.map((location) => normalizeLocation(location, { ...seed, status })).filter((location) => location.province || location.city)
      : [],
    status,
  }
}

function seedNames(seed) {
  return uniqueStrings([seed.canonicalName, ...(seed.aliases || [])])
}

function existingNames(school) {
  return uniqueStrings([school.canonical_name, school.name, ...(Array.isArray(school.aliases) ? school.aliases : splitLabels(school.aliases))])
}

function buildNameMap(schools) {
  const map = new Map()
  for (const school of schools || []) {
    for (const name of existingNames(school)) {
      const key = normalizeName(name)
      if (key && !map.has(key)) map.set(key, school)
    }
  }
  return map
}

function findExistingSchool(seed, nameMap) {
  for (const name of seedNames(seed)) {
    const match = nameMap.get(normalizeName(name))
    if (match) return match
  }
  return null
}

function toSchoolPayload(seed, schoolId) {
  const aliases = uniqueStrings((seed.aliases || []).filter((alias) => normalizeName(alias) !== normalizeName(seed.canonicalName)))
  return {
    id: schoolId,
    name: seed.canonicalName,
    canonical_name: seed.canonicalName,
    description: compact(seed.description, 1000),
    school_type: compact(seed.schoolType || seed.school_type || '创新学校/学习社区', 200),
    age_range: compact(seed.ageRange || seed.age_range, 200),
    fee: compact(seed.fee, 500),
    has_xuji: !!seed.hasXuji || !!seed.has_xuji,
    xuji_note: compact(seed.xujiNote || seed.xuji_note, 1000),
    residency_req: compact(seed.residencyReq || seed.residency_req, 800),
    admission_req: compact(seed.admissionReq || seed.admission_req, 800),
    output_direction: compact(seed.outputDirection || seed.output_direction, 1000),
    official_url: compact(seed.officialUrl || seed.official_url, 500),
    aliases,
    source: normalizeString(seed.source || IMPORT_ID),
    source_import_id: IMPORT_ID,
    source_note: compact(seed.sourceNote || seed.source_note, 800),
    status: normalizeString(seed.status || 'published'),
  }
}

function mergePayload(existing, incoming, mergeMode) {
  const fields = ['name', 'canonical_name', 'description', 'school_type', 'age_range', 'fee', 'has_xuji', 'xuji_note', 'residency_req', 'admission_req', 'output_direction', 'official_url', 'aliases', 'source', 'source_note', 'status']
  const data = {}
  const changedFields = []

  for (const field of fields) {
    const incomingValue = incoming[field]
    if (incomingValue === undefined || incomingValue === null) continue
    if (typeof incomingValue === 'string' && !incomingValue.trim()) continue
    if (Array.isArray(incomingValue) && incomingValue.length === 0) continue

    if (field === 'aliases') {
      const current = uniqueStrings(Array.isArray(existing.aliases) ? existing.aliases : splitLabels(existing.aliases))
      const merged = uniqueStrings([...current, ...incomingValue])
      if (merged.join('|') !== current.join('|')) {
        data.aliases = merged
        changedFields.push('aliases')
      }
      continue
    }

    const empty = existing[field] === undefined || existing[field] === null || existing[field] === ''
    if (mergeMode === OVERWRITE || empty) {
      if (JSON.stringify(existing[field] ?? '') !== JSON.stringify(incomingValue)) {
        data[field] = incomingValue
        changedFields.push(field)
      }
    }
  }

  if (changedFields.length > 0) data.updatedAt = db.serverDate()
  return { data, changedFields }
}

async function listExistingSchools() {
  const res = await db.collection('schools')
    .field({ id: true, name: true, canonical_name: true, aliases: true, status: true, description: true, school_type: true, age_range: true, fee: true, has_xuji: true, xuji_note: true, residency_req: true, admission_req: true, output_direction: true, official_url: true, source: true, source_note: true })
    .limit(MAX_EXISTING_SCHOOLS)
    .get()
  return res.data || []
}

async function getCurrentMaxSchoolId() {
  const res = await db.collection('schools').field({ id: true }).orderBy('id', 'desc').limit(1).get()
  return normalizeNumber((res.data || [])[0]?.id)
}

async function listLocationsForSchool(schoolId) {
  if (!normalizeNumber(schoolId)) return []
  const res = await db.collection(SCHOOL_LOCATION_COLLECTION)
    .where({ school_id: normalizeNumber(schoolId) })
    .field({ school_id: true, province: true, city: true, address_note: true, contact_note: true, status: true, source: true })
    .limit(100)
    .get()
  return res.data || []
}

function locationKey(location) {
  return `${normalizeString(location.province)}::${normalizeString(location.city)}`
}

async function upsertMissingLocations(school, seed, dryRun) {
  const schoolId = normalizeNumber(school.id)
  if (!schoolId || !Array.isArray(seed.locations) || seed.locations.length === 0) return []
  const existing = await listLocationsForSchool(schoolId)
  const existingByKey = new Map(existing.map((location) => [locationKey(location), location]))
  const actions = []

  for (const location of seed.locations) {
    const key = locationKey(location)
    if (!key.replace(/:/g, '').trim() || existingByKey.has(key)) continue
    const data = {
      school_id: schoolId,
      school_doc_id: school._id || '',
      school_name: normalizeString(school.canonical_name || school.name || seed.canonicalName),
      province: location.province,
      city: location.city,
      address_note: location.addressNote,
      contact_note: location.contactNote,
      status: location.status || seed.status || 'published',
      source: location.source || seed.source || IMPORT_ID,
      source_import_id: IMPORT_ID,
      updatedAt: db.serverDate(),
    }
    if (!dryRun) await db.collection(SCHOOL_LOCATION_COLLECTION).doc(stableLocationId(schoolId, data.province, data.city)).set({ data: { ...data, createdAt: db.serverDate() } })
    actions.push({ action: 'create_location', schoolId, schoolName: data.school_name, province: data.province, city: data.city })
  }
  return actions
}

async function importTaihuaSchools202606(event, wxContext) {
  const requestId = resolveRequestId('import-taihua-schools-2026-06', event)
  const dryRun = event.dryRun !== false
  const mergeMode = event.mergeMode === OVERWRITE ? OVERWRITE : FILL_EMPTY
  const publishScreenshotOnly = event.publishScreenshotOnly === true
  const incomingRecords = Array.isArray(event.records) && event.records.length > 0 ? event.records : TAIHUA_SCHOOL_IMPORT_2026_06
  const startIndex = Math.max(Number(event.startIndex || 0), 0)
  const limit = Math.min(Math.max(Number(event.limit || DEFAULT_LIMIT), 1), MAX_LIMIT)

  try {
    const admin = await getActiveAdmin(wxContext.OPENID)
    if (!admin) return fail(requestId, 'FORBIDDEN', '无权限导入学习社区数据')

    const seeds = incomingRecords.slice(startIndex, startIndex + limit).map((seed) => normalizeSeed(seed, { publishScreenshotOnly })).filter((seed) => seed.canonicalName)
    const existingSchools = await listExistingSchools()
    const nameMap = buildNameMap(existingSchools)
    let nextSchoolId = await getCurrentMaxSchoolId()
    const created = []
    const updated = []
    const matched = []
    const locationActions = []

    for (const seed of seeds) {
      let existing = findExistingSchool(seed, nameMap)
      if (existing) {
        const payload = toSchoolPayload(seed, normalizeNumber(existing.id))
        const { data, changedFields } = mergePayload(existing, payload, mergeMode)
        matched.push({ seedName: seed.canonicalName, schoolId: normalizeNumber(existing.id), existingName: normalizeString(existing.canonical_name || existing.name), changedFields })
        if (changedFields.length > 0) {
          if (!dryRun) await db.collection('schools').doc(existing._id).update({ data })
          updated.push({ schoolId: normalizeNumber(existing.id), name: normalizeString(existing.canonical_name || existing.name), changedFields })
        }
        locationActions.push(...await upsertMissingLocations(existing, seed, dryRun))
        continue
      }

      nextSchoolId += 1
      const newSchool = { ...toSchoolPayload(seed, nextSchoolId), createdAt: db.serverDate(), updatedAt: db.serverDate() }
      existing = { ...newSchool, _id: '' }
      if (!dryRun) {
        const addRes = await db.collection('schools').add({ data: newSchool })
        existing._id = addRes._id || ''
      }
      created.push({ schoolId: nextSchoolId, name: seed.canonicalName, status: newSchool.status, source: seed.source })
      for (const name of seedNames(seed)) {
        const key = normalizeName(name)
        if (key && !nameMap.has(key)) nameMap.set(key, existing)
      }
      locationActions.push(...await upsertMissingLocations(existing, seed, dryRun))
    }

    if (!dryRun) {
      await writeAdminAuditLog({
        admin,
        openid: wxContext.OPENID,
        action: 'taihua_school_import_2026_06',
        targetType: 'schools',
        targetId: `${startIndex}-${startIndex + seeds.length - 1}`,
        metadata: { mergeMode, publishScreenshotOnly, batchCount: seeds.length, createdCount: created.length, updatedCount: updated.length, locationCreateCount: locationActions.length },
      })
    }

    const nextStartIndex = startIndex + limit
    return ok(requestId, {
      dryRun,
      mergeMode,
      publishScreenshotOnly,
      totalSeedCount: incomingRecords.length,
      startIndex,
      batchCount: seeds.length,
      nextStartIndex,
      hasMore: nextStartIndex < incomingRecords.length,
      createdCount: created.length,
      updatedCount: updated.length,
      matchedCount: matched.length,
      locationCreateCount: locationActions.length,
      missingSchools: created.slice(0, 120),
      updatedSchools: updated.slice(0, 120),
      matchedSchools: matched.slice(0, 120),
      locationActions: locationActions.slice(0, 120),
      message: dryRun ? '这是 dryRun 预览；确认后用 dryRun:false 执行导入。' : '学习社区导入/合并完成',
    })
  } catch (err) {
    console.error('appService importTaihuaSchools202606 error:', err)
    return fail(requestId, 'IMPORT_TAIHUA_SCHOOLS_FAILED', '导入学习社区数据失败，请稍后重试')
  }
}

module.exports = {
  importTaihuaSchools202606,
}
