const fs = require('fs')

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, content) {
  fs.writeFileSync(path, content)
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) throw new Error(`Missing replacement target: ${label}`)
  return content.replace(search, replacement)
}

function edit(path, transform) {
  const before = read(path)
  const after = transform(before)
  if (after === before) throw new Error(`No changes produced for ${path}`)
  write(path, after)
  console.log(`updated ${path}`)
}

edit('src/pages/events/shared.ts', (input) => {
  let text = input
  text = replaceOnce(text,
`  community_program: '项目招募',
  workshop: '工作坊',`,
`  community_program: '项目招募',
  camp: '营期/短期营',
  workshop: '工作坊',`,
'add camp label')
  text = replaceOnce(text,
`  group: '团体',
}`,
`  group: '团体',
  other: '其他',
}`,
'add other label')
  text = replaceOnce(text,
`  community_program: palette.brandSoft,
  workshop: palette.accent2Soft,`,
`  community_program: palette.brandSoft,
  camp: palette.greenSoft,
  workshop: palette.accent2Soft,`,
'add camp icon')
  text = replaceOnce(text,
`  group: palette.greenSoft,
}`,
`  group: palette.greenSoft,
  other: palette.iconBg,
}`,
'add other icon')
  text = replaceOnce(text,
`const EVENT_TIMEZONE = 'Asia/Shanghai'

export function getEventIconBg`,
`const EVENT_TIMEZONE = 'Asia/Shanghai'

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

export function getEventIconBg`,
'add database-backed helpers')
  return text
})

edit('src/pages/events/index.tsx', (input) => {
  let text = input
  text = replaceOnce(text,
`  formatEventAgeRange,
  formatEventFee,
  formatEventTime,`,
`  formatEventAgeRange,
  formatEventAudience,
  formatEventFee,
  formatEventTime,
  formatEventTypeLabels,`,
'import database display helpers')
  text = replaceOnce(text,
`  getEventStatusKey,
  isEventEnded,`,
`  getEventStatusKey,
  isEventAgeUnspecified,
  isEventEnded,`,
'import age helper')
  text = replaceOnce(text,
`function eventMatchesAudience(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => itemHasLabel(item.audience_who, filter) || (String(item.description || '').includes('参与对象：') && String(item.description || '').includes(filter)))
}`,
`function eventMatchesAudience(item: EventItemWithInterest, filters: string[]) {
  return eventMatchesAny(filters, (filter) => itemHasLabel(item.audience_who, filter))
}`,
'remove description inference')
  text = replaceOnce(text,
`        const typeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type`,
`        const typeLabel = formatEventTypeLabels(item)`,
'type label from database')
  text = replaceOnce(text,
`        const ageRangeText = formatEventAgeRange(item)
        return (`,
`        const ageRangeText = formatEventAgeRange(item)
        const audienceText = formatEventAudience(item)
        const ageIsUnspecified = isEventAgeUnspecified(item)
        return (`,
'prepare compact participation line')
  text = replaceOnce(text,
`              <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>参与年龄：{ageRangeText}</Text></View>`,
`              {ageIsUnspecified
                ? <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>参与对象：{audienceText}</Text></View>
                : <View className='app-list-card__meta-line'><Text className='text-meta text-color-sub'>参与年龄：{ageRangeText}</Text></View>}`,
'conditional audience/age summary')
  return text
})

edit('src/pages/event-detail/index.tsx', (input) => {
  let text = input
  text = replaceOnce(text,
`import { EVENT_TYPE_LABELS, formatEventAgeRange, formatEventDate, getEventIconBg, getEventStatusInfo } from '../events/shared'`,
`import { formatEventAgeRange, formatEventAudience, formatEventDate, formatEventTypeLabels, getEventIconBg, getEventStatusInfo } from '../events/shared'`,
'import shared database formatters')
  const legacyHelpers = `function normalizeLabels(value: unknown) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[、,，/|｜]+/)
  return Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)))
}

function formatEventTypes(event: EventItem) {
  const labels = normalizeLabels(event.event_types)
  if (labels.length > 0) return labels.join('、')
  return EVENT_TYPE_LABELS[event.event_type] || event.event_type || '未注明'
}

function formatAudience(event: EventItem) {
  const labels = normalizeLabels(event.audience_who)
  return labels.length > 0 ? labels.join('、') : '未注明'
}

`
  text = replaceOnce(text, legacyHelpers, '', 'remove duplicate detail formatters')
  text = replaceOnce(text,
`          <AppTag text={EVENT_TYPE_LABELS[event.event_type] || event.event_type} tone='brand' />`,
`          <AppTag text={formatEventTypeLabels(event)} tone='brand' />`,
'header type from database')
  text = replaceOnce(text,
`      <AppInfoRow label='活动类型' value={formatEventTypes(event)} />
      <AppInfoRow label='参与对象' value={formatAudience(event)} />`,
`      <AppInfoRow label='活动类型' value={formatEventTypeLabels(event)} />
      <AppInfoRow label='参与对象' value={formatEventAudience(event)} />`,
'detail rows from database')
  return text
})

edit('src/pkg/events/submit/index.tsx', (input) => {
  let text = input
  text = replaceOnce(text,
`const EVENT_TYPE_OPTIONS = ['工作坊', '营期/短期营', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他']`,
`const EVENT_TYPE_OPTIONS = ['工作坊', '营期/短期营', '项目招募', '圆桌讨论', '交友聚会', '家庭活动', '一对一', '团体', '其他']`,
'align submit event types')
  text = replaceOnce(text,
`  const [audienceWhoOther, setAudienceWhoOther] = useState('')
  const [ageRangeMin, setAgeRangeMin] = useState(0)`,
`  const [audienceWhoOther, setAudienceWhoOther] = useState('')
  const [hasAgeRequirement, setHasAgeRequirement] = useState(false)
  const [ageRangeMin, setAgeRangeMin] = useState(0)`,
'add optional age state')
  text = replaceOnce(text,
`    audienceWho.length > 0 || audienceWhoOther.trim() || ageRangeMin !== AGE_RANGE_MIN || ageRangeMax !== AGE_RANGE_MAX || startDate || endDate ||`,
`    audienceWho.length > 0 || audienceWhoOther.trim() || hasAgeRequirement || ageRangeMin !== AGE_RANGE_MIN || ageRangeMax !== AGE_RANGE_MAX || startDate || endDate ||`,
'age dirty state')
  text = replaceOnce(text,
`        minAgeRequirement: getMinAgeRequirement(ageRangeMin), maxAgeRequirement: getMaxAgeRequirement(ageRangeMax),`,
`        minAgeRequirement: hasAgeRequirement ? getMinAgeRequirement(ageRangeMin) : '', maxAgeRequirement: hasAgeRequirement ? getMaxAgeRequirement(ageRangeMax) : '',`,
'write age only when supplied')
  text = replaceOnce(text,
`        <SectionTitle text='年龄区间' /><AgeRangeSlider minValue={ageRangeMin} maxValue={ageRangeMax} onChange={(minValue, maxValue) => { setAgeRangeMin(minValue); setAgeRangeMax(maxValue) }} />`,
`        <SectionTitle text='参与年龄（选填）' /><FormInputBox><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, ...typography.body, color: palette.text }}>{hasAgeRequirement ? '填写年龄区间' : '未注明 / 不适用'}</Text><Switch checked={hasAgeRequirement} color={palette.accentDeep} onChange={(e) => setHasAgeRequirement(!!e.detail.value)} /></View></FormInputBox>
        {hasAgeRequirement ? <AgeRangeSlider minValue={ageRangeMin} maxValue={ageRangeMax} onChange={(minValue, maxValue) => { setAgeRangeMin(minValue); setAgeRangeMax(maxValue) }} /> : null}`,
'optional age UI')
  return text
})

edit('cloudfunctions/appService/lib/eventPublishPayload.js', (input) => {
  let text = input
  text = replaceOnce(text,
`  '工作坊': 'workshop',`,
`  '工作坊': 'workshop',
  '营期/短期营': 'camp',`,
'camp backend mapping')
  text = replaceOnce(text,
`  '其他': 'meetup',`,
`  '其他': 'other',`,
'other backend mapping')
  text = replaceOnce(text,
`function normalizeEventType(submission) {
  return EVENT_TYPE_MAP[firstEventType(submission)] || 'meetup'
}`,
`function normalizeEventType(submission) {
  const eventType = firstEventType(submission)
  if (String(eventType).startsWith('其他：')) return 'other'
  return EVENT_TYPE_MAP[eventType] || 'other'
}`,
'canonical event type fallback')
  return text
})

edit('src/constants/filterOptions.ts', (input) => {
  let text = input
  text = replaceOnce(text,
`  eventTypes: [ALL_FILTER, '工作坊', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他'],`,
`  eventTypes: [ALL_FILTER, '工作坊', '营期/短期营', '项目招募', '圆桌讨论', '交友聚会', '家庭活动', '一对一', '团体', '其他'],`,
'frontend filter type options')
  text = replaceOnce(text,
`  status: [ALL_FILTER, 'recruiting', 'recurring', 'ended'],`,
`  status: [ALL_FILTER, 'recruiting', 'ended'],`,
'frontend status options')
  text = replaceOnce(text,
`    工作坊: 'workshop',
    项目招募: 'community_program',`,
`    工作坊: 'workshop',
    '营期/短期营': 'camp',
    项目招募: 'community_program',`,
'frontend camp map')
  text = replaceOnce(text,
`    交友聚会: 'meetup',
    一对一: 'one_on_one',`,
`    交友聚会: 'meetup',
    家庭活动: 'family',
    一对一: 'one_on_one',`,
'frontend family map')
  return text
})

edit('cloudfunctions/appService/handlers/filterOptions.js', (input) => {
  let text = input
  text = replaceOnce(text,
`  eventTypes: ['全部', '工作坊', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他'],`,
`  eventTypes: ['全部', '工作坊', '营期/短期营', '项目招募', '圆桌讨论', '交友聚会', '家庭活动', '一对一', '团体', '其他'],`,
'backend filter type options')
  text = replaceOnce(text,
`  status: ['全部', 'recruiting', 'recurring', 'ended'],`,
`  status: ['全部', 'recruiting', 'ended'],`,
'backend status options')
  text = replaceOnce(text,
`    工作坊: 'workshop',
    项目招募: 'community_program',`,
`    工作坊: 'workshop',
    '营期/短期营': 'camp',
    项目招募: 'community_program',`,
'backend camp map')
  text = replaceOnce(text,
`    交友聚会: 'meetup',
    一对一: 'one_on_one',`,
`    交友聚会: 'meetup',
    家庭活动: 'family',
    一对一: 'one_on_one',`,
'backend family map')
  return text
})

write('docs/EVENT_DATA_CONTRACT.md', `# 活动数据契约\n\n活动列表、活动卡片和活动详情以 CloudBase \`events\` 集合中的结构化字段为唯一事实源。前端不得从 \`description\`、标题或活动类型推测参与对象、年龄、周期或费用。\n\n## 核心字段\n\n- \`event_types: string[]\`：用户可见的活动类型，可多选。\n- \`event_type: string\`：用于图标、筛选和旧数据兼容的主类型代码，由发布流程从 \`event_types\` 派生。\n- \`audience_who: string[]\`：参与对象。空数组或缺失表示未注明。\n- \`min_age_requirement / max_age_requirement: string\`：参与年龄。两者均为空表示未注明或不适用。\n- \`is_recurring: boolean\` 与 \`recurrence_pattern: string\`：是否周期性及周期说明。\n- \`status: recruiting | ended\`：报名状态。周期性不是报名状态。\n\n## 显示规则\n\n活动卡片固定展示时间、地点、费用和一行参与信息：\n\n- 年龄已填写：显示“参与年龄”。\n- 年龄未填写：改为显示“参与对象”。\n- 年龄和参与对象都未填写：显示“参与对象：未注明”。\n\n详情页同时展示参与对象和年龄区间，缺失值如实显示“未注明”。\n\n## 类型映射\n\n- 工作坊 → \`workshop\`\n- 营期/短期营 → \`camp\`\n- 项目招募 → \`community_program\`\n- 圆桌讨论 → \`discussion\`\n- 交友聚会 → \`meetup\`\n- 家庭活动 → \`family\`\n- 一对一 → \`one_on_one\`\n- 团体 → \`group\`\n- 其他及“其他：...” → \`other\`\n\n旧记录缺少 \`event_types\` 时，可以暂时用 \`event_type\` 转换为显示文案；一旦补齐 \`event_types\`，页面必须优先显示数据库数组。\n`)
console.log('wrote docs/EVENT_DATA_CONTRACT.md')
