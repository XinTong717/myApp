const { db, _ } = require('./cloud')

const SCHOOL_LIST_LIMIT = 200
const EVENT_LIST_LIMIT = 50

function normalizeLimit(value, fallback, max) {
  return Math.min(Math.max(Number(value || fallback), 1), max)
}

function isFinitePositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

async function listSchools(limit = SCHOOL_LIST_LIMIT) {
  const res = await db.collection('schools')
    .where({ status: _.neq('deleted') })
    .field({
      id: true,
      name: true,
      province: true,
      city: true,
      age_range: true,
      school_type: true,
    })
    .orderBy('id', 'asc')
    .limit(normalizeLimit(limit, SCHOOL_LIST_LIMIT, SCHOOL_LIST_LIMIT))
    .get()

  return res.data || []
}

async function getSchoolById(schoolId) {
  if (!isFinitePositiveNumber(schoolId)) return null

  const res = await db.collection('schools')
    .where({ id: Number(schoolId), status: _.neq('deleted') })
    .limit(1)
    .get()

  return res.data?.[0] || null
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
  SCHOOL_LIST_LIMIT,
  EVENT_LIST_LIMIT,
  listSchools,
  getSchoolById,
  listEvents,
  getEventById,
}
