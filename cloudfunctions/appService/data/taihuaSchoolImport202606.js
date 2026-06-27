// Auto-generated from user-provided Taihua school screenshots and uploaded document.
// Source date: 2026-06. Keep this file as import seed data only.

const COLUMNS = ["canonicalName", "aliases", "locations", "status", "source", "schoolType", "ageRange", "fee", "description", "officialUrl", "xujiNote", "residencyReq", "admissionReq", "outputDirection", "sourceNote"]
const RAW_PARTS = [
  require('./taihuaSchoolImport202606.part1'),
  require('./taihuaSchoolImport202606.part2'),
  require('./taihuaSchoolImport202606.part3'),
  require('./taihuaSchoolImport202606.part4'),
  require('./taihuaSchoolImport202606.part5'),
  require('./taihuaSchoolImport202606.part6'),
  require('./taihuaSchoolImport202606.part7'),
  require('./taihuaSchoolImport202606.part8'),
]

function splitList(value, sep) {
  return String(value || '').split(sep).map((item) => item.trim()).filter(Boolean)
}

function parseLocations(value) {
  return splitList(value, ';').map((item) => {
    const parts = item.split('/').map((part) => part.trim())
    return {
      province: parts[0] || '',
      city: parts[1] || '',
      addressNote: parts.slice(2).join('/'),
      contactNote: '',
      status: 'published',
      source: 'taihua_school_import_2026_06',
    }
  }).filter((item) => item.province || item.city || item.addressNote)
}

const TAIHUA_SCHOOL_IMPORT_2026_06 = RAW_PARTS
  .join('\n')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line, index) => {
    const values = line.split('\t')
    const row = Object.fromEntries(COLUMNS.map((column, i) => [column, values[i] || '']))
    return {
      canonicalName: row.canonicalName,
      aliases: splitList(row.aliases, '|'),
      locations: parseLocations(row.locations),
      status: row.status || 'draft',
      source: row.source || 'taihua_school_import_2026_06',
      schoolType: row.schoolType || '创新学校/学习社区',
      ageRange: row.ageRange,
      fee: row.fee,
      description: row.description,
      officialUrl: row.officialUrl,
      hasXuji: !!row.xujiNote,
      xujiNote: row.xujiNote,
      residencyReq: row.residencyReq,
      admissionReq: row.admissionReq,
      outputDirection: row.outputDirection,
      sourceNote: row.sourceNote,
      sourceRow: index + 1,
    }
  })

module.exports = { TAIHUA_SCHOOL_IMPORT_2026_06 }
