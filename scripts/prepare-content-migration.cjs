const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

const inputDir = path.join(__dirname, 'migration-data')
const outputDir = path.join(__dirname, 'migration-output')

fs.mkdirSync(outputDir, { recursive: true })

function readCsv(filename) {
  const filePath = path.join(inputDir, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing input file: ${filePath}`)
  }

  const raw = fs.readFileSync(filePath, 'utf8')

  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  })
}

function cleanText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  const text = String(value || '').trim().toLowerCase()
  return ['true', '1', 'yes', 'y', '是'].includes(text)
}

function normalizeSchool(row) {
  const id = toNumber(row.id)

  if (!id) {
    throw new Error(`school id invalid: ${JSON.stringify(row)}`)
  }

  return {
    _id: `school_${id}`,
    id,
    name: cleanText(row.name),
    province: cleanText(row.province),
    city: cleanText(row.city),
    age_range: cleanText(row.age_range),
    school_type: cleanText(row.school_type),
    has_xuji: toBoolean(row.has_xuji),
    xuji_note: cleanText(row.xuji_note),
    residency_req: cleanText(row.residency_req),
    admission_req: cleanText(row.admission_req),
    fee: cleanText(row.fee),
    output_direction: cleanText(row.output_direction),
    official_url: cleanText(row.official_url),
    status: 'published',
    source: 'memfire_migration',
  }
}

function normalizeEvent(row) {
  const id = toNumber(row.id)

  if (!id) {
    throw new Error(`event id invalid: ${JSON.stringify(row)}`)
  }

  return {
    _id: `event_${id}`,
    id,
    title: cleanText(row.title),
    event_type: cleanText(row.event_type),
    description: cleanText(row.description),
    start_time: cleanText(row.start_time),
    end_time: cleanText(row.end_time),
    location: cleanText(row.location),
    fee: cleanText(row.fee),
    status: cleanText(row.status) || 'upcoming',
    organizer: cleanText(row.organizer),
    is_online: toBoolean(row.is_online),
    source: 'memfire_migration',

    // Reserved for the next migration step: move event contact/sign-up data into events.
    contact_info: cleanText(row.contact_info),
    official_url: cleanText(row.official_url),
    signup_note: cleanText(row.signup_note),
  }
}

function writeJson(filename, data) {
  const filePath = path.join(outputDir, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`Wrote ${filePath}: ${data.length} records`)
}

const schools = readCsv('schools.csv').map(normalizeSchool)
const events = readCsv('events.csv').map(normalizeEvent)

writeJson('schools.json', schools)
writeJson('events.json', events)

console.log('\nPreview:')
console.log('schools[0] =', schools[0])
console.log('events[0] =', events[0])
