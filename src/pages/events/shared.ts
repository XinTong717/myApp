import { palette } from '../../theme/palette'

export type EventItem = {
  id: number
  title: string
  province?: string
  city?: string
  event_type: string
  event_types?: string[]
  audience_who?: string[]
  min_age_requirement?: string
  max_age_requirement?: string
  signup_deadline?: string
  is_recurring?: boolean
  recurrence_pattern?: string
  fee_category?: string
  early_bird_price?: string
  early_bird_deadline?: string
  description?: string
  start_time?: string
  end_time?: string
  location?: string
  fee?: string
  status?: string
  organizer?: string
  is_online?: boolean
  contact_info?: string
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  night_chat: '夜聊',
  parent_observer: '家长观察',
  community_program: '项目招募',
  camp: '营期/短期营',
  workshop: '工作坊',
  meetup: '交友聚会',
  discussion: '圆桌讨论',
  family: '家庭活动',
  online: '线上活动',
  one_on_one: '一对一',
  group: '团体',
  other: '其他',
}

export const EVENT_STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  recruiting: { text: '招募中', color: palette.brand, bg: palette.brandSoft },
  ended: { text: '已结束报名', color: palette.muted, bg: palette.surfaceSoft },
}

const EVENT_TYPE_ICON_BG: Record<string, string> = {
  night_chat: palette.brandSoft,
  parent_observer: palette.accent2Soft,
  community_program: palette.brandSoft,
  camp: palette.greenSoft,
  workshop: palette.accent2Soft,
  meetup: palette.greenSoft,
  discussion: palette.iconBgAlt,
  family: palette.greenSoft,
  online: palette.accent2Soft,
  one_on_one: palette.iconBgAlt,
  group: palette.greenSoft,
  other: palette.iconBg,
}

const EVENT_TIMEZONE = 'Asia/Shanghai'

export function normalizeEventLabels(value: unknown): string[] {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)))
}

export function formatEventTypeLabels(event: Pick<EventItem, 'event_type' | 'event_types'>) {
  const databaseLabels = normalizeEventLabels(event.event_types)
  if (databaseLabels.length > 0) return databaseLabels.join('、')
  return EVENT_TYPE_LABELS[event.event_type] || String(event.event_type || '').trim() || '未注明'
}

export function formatEventAudience(event: Pick<EventItem, 'audience_who'>) {
  const databaseLabels = normalizeEventLabels(event.audience_who)
  return databaseLabels.length > 0 ? databaseLabels.join('、') : '未注明'
}

export function isEventAgeUnspecified(event: Pick<EventItem, 'min_age_requirement' | 'max_age_requirement'>) {
  return !String(event.min_age_requirement || '').trim() && !String(event.max_age_requirement || '').trim()
}

export function getEventIconBg(eventType: string) {
  return EVENT_TYPE_ICON_BG[eventType] || palette.iconBg
}

function parseEventDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEventDate(value?: string) {
  const text = String(value || '').trim()
  if (!text) return ''
  const literal = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (literal) return `${literal[1]}年${Number(literal[2])}月${Number(literal[3])}日`
  const date = parseEventDate(value)
  return date ? date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: EVENT_TIMEZONE }) : ''
}

export function getEventStatusKey(event: Pick<EventItem, 'status' | 'start_time' | 'end_time' | 'signup_deadline' | 'is_recurring'>) {
  const signupDeadline = parseEventDate(event.signup_deadline)
  if (signupDeadline && signupDeadline.getTime() < Date.now()) return 'ended'
  if (event.status === 'ended') return 'ended'
  return 'recruiting'
}

export function getEventStatusInfo(event: Pick<EventItem, 'status' | 'start_time' | 'end_time' | 'signup_deadline' | 'is_recurring'>) {
  const statusKey = getEventStatusKey(event)
  if (!statusKey) return null

  return EVENT_STATUS_LABELS[statusKey] || {
    text: statusKey,
    color: palette.subtext,
    bg: palette.surfaceSoft,
  }
}

export function isEventEnded(event: Pick<EventItem, 'status' | 'start_time' | 'end_time' | 'signup_deadline' | 'is_recurring'>) {
  return getEventStatusKey(event) === 'ended'
}

export function formatEventAgeRange(event: Pick<EventItem, 'min_age_requirement' | 'max_age_requirement'>) {
  const minText = String(event.min_age_requirement || '').trim()
  const maxText = String(event.max_age_requirement || '').trim()
  if (!minText && !maxText) return '未注明'
  if (minText === '全年龄' && !maxText) return '全年龄'
  if (!minText || minText === '全年龄') return maxText || '全年龄'
  if (!maxText) return minText
  const minMatch = minText.match(/\d+(?:\.\d+)?/)
  const maxMatch = maxText.match(/\d+(?:\.\d+)?/)
  if (minMatch && maxMatch) return `${minMatch[0]}-${maxMatch[0]}岁`
  return `${minText} - ${maxText}`
}

function formatEarlyBirdDeadline(value?: string) {
  const date = parseEventDate(value)
  if (!date) return ''
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', timeZone: EVENT_TIMEZONE })
}

export function formatEventFee(event: Pick<EventItem, 'fee' | 'early_bird_price' | 'early_bird_deadline'>) {
  const regularFee = String(event.fee || '').trim() || '免费'
  const earlyBirdPrice = String(event.early_bird_price || '').trim()
  const deadline = parseEventDate(event.early_bird_deadline)
  if (!earlyBirdPrice || !deadline || deadline.getTime() < Date.now()) return regularFee
  const deadlineText = formatEarlyBirdDeadline(event.early_bird_deadline)
  return `早鸟 ${earlyBirdPrice}${deadlineText ? `（至 ${deadlineText}）` : ''}｜常规 ${regularFee}`
}

export function formatEventTime(event: Pick<EventItem, 'event_type' | 'start_time' | 'end_time' | 'is_recurring' | 'recurrence_pattern'>) {
  if (event.is_recurring) return event.recurrence_pattern || '周期性进行'

  const startText = formatEventDate(event.start_time)
  const endText = formatEventDate(event.end_time)

  if (startText && endText) {
    return startText === endText ? startText : `${startText} - ${endText}`
  }

  return startText || endText || '待定'
}
