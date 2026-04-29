import { palette } from '../../theme/palette'

export type EventItem = {
  id: number
  title: string
  event_type: string
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
  community_program: '社区计划',
  workshop: '工作坊',
  meetup: '聚会',
  discussion: '讨论',
  family: '家庭活动',
  online: '线上活动',
}

export const EVENT_STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  recurring: { text: '每周进行', color: palette.tagText, bg: palette.tag },
  recruiting: { text: '招募中', color: palette.brand, bg: palette.brandSoft },
  upcoming: { text: '即将开始', color: palette.info, bg: palette.infoSoft },
  ongoing: { text: '进行中', color: palette.tagText, bg: palette.tag },
  ended: { text: '已结束', color: palette.muted, bg: palette.surfaceSoft },
}

export const EVENT_TYPE_ICONS: Record<string, string> = {
  night_chat: '🌙',
  parent_observer: '👀',
  community_program: '🚀',
  workshop: '🛠️',
  meetup: '☕',
  discussion: '💬',
  family: '🏠',
  online: '💻',
}

function parseEventDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value?: string) {
  const date = parseEventDate(value)
  return date ? date.toLocaleString('zh-CN', { hour12: false }) : ''
}

export function getEventStatusKey(event: Pick<EventItem, 'status' | 'start_time' | 'end_time'>) {
  const endTime = parseEventDate(event.end_time)
  if (endTime && endTime.getTime() < Date.now()) {
    return 'ended'
  }
  return event.status || ''
}

export function getEventStatusInfo(event: Pick<EventItem, 'status' | 'start_time' | 'end_time'>) {
  const statusKey = getEventStatusKey(event)
  if (!statusKey) return null

  return EVENT_STATUS_LABELS[statusKey] || {
    text: statusKey,
    color: palette.subtext,
    bg: palette.surfaceSoft,
  }
}

export function isEventEnded(event: Pick<EventItem, 'status' | 'start_time' | 'end_time'>) {
  return getEventStatusKey(event) === 'ended'
}

export function formatEventTime(event: Pick<EventItem, 'event_type' | 'start_time' | 'end_time'>) {
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
