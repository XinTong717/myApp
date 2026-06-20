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
  workshop: '工作坊',
  meetup: '交友聚会',
  discussion: '圆桌讨论',
  family: '家庭活动',
  online: '线上活动',
  one_on_one: '一对一',
  group: '团体',
}

export const EVENT_STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  recurring: { text: '周期性', color: palette.tagText, bg: palette.tag },
  recruiting: { text: '招募中', color: palette.brand, bg: palette.brandSoft },
  ended: { text: '已结束报名', color: palette.muted, bg: palette.surfaceSoft },
}

const EVENT_TYPE_ICON_BG: Record<string, string> = {
  night_chat: palette.brandSoft,
  parent_observer: palette.accent2Soft,
  community_program: palette.brandSoft,
  workshop: palette.accent2Soft,
  meetup: palette.greenSoft,
  discussion: palette.iconBgAlt,
  family: palette.greenSoft,
  online: palette.accent2Soft,
  one_on_one: palette.iconBgAlt,
  group: palette.greenSoft,
}

const EVENT_TIMEZONE = 'Asia/Shanghai'

export function getEventIconBg(eventType: string) {
  return EVENT_TYPE_ICON_BG[eventType] || palette.iconBg
}

function parseEventDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value?: string) {
  const date = parseEventDate(value)
  return date ? date.toLocaleString('zh-CN', { hour12: false, timeZone: EVENT_TIMEZONE }) : ''
}

export function getEventStatusKey(event: Pick<EventItem, 'status' | 'start_time' | 'end_time' | 'signup_deadline' | 'is_recurring'>) {
  if (event.is_recurring || event.status === 'recurring') return 'recurring'
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

export function formatEventTime(event: Pick<EventItem, 'event_type' | 'start_time' | 'end_time' | 'is_recurring' | 'recurrence_pattern'>) {
  if (event.is_recurring && event.recurrence_pattern) return event.recurrence_pattern

  if (event.event_type === 'night_chat' || event.event_type === 'parent_observer') {
    return '每周六 20:30 - 21:30'
  }

  if (event.event_type === 'community_program') {
    return '持续进行'
  }

  const startText = formatDateTime(event.start_time)
  const endText = formatDateTime(event.end_time)

  if (startText && endText) {
    return `${startText} - ${endText}`
  }

  return startText || endText || '待定'
}
