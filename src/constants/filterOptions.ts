export const ALL_FILTER = '全部'
export const EVENT_DEFAULT_STATUS_FILTER = 'recruiting'

export const EVENT_FILTER_FALLBACKS = {
  eventTypes: [ALL_FILTER, '工作坊', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他'],
  audience: [ALL_FILTER, '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '其他'],
  fee: [ALL_FILTER, '免费', '付费', '公益随喜', '费用待确认'],
  status: [ALL_FILTER, 'recruiting', 'recurring', 'ended'],
  eventTypeValueMap: {
    工作坊: 'workshop',
    项目招募: 'community_program',
    圆桌讨论: 'discussion',
    交友聚会: 'meetup',
    一对一: 'one_on_one',
    团体: 'group',
  } as Record<string, string>,
}

export const SCHOOL_FILTER_FALLBACKS = {
  allOption: ALL_FILTER,
  listLimit: 200,
  maxDynamicOptions: 16,
  provinces: [] as string[],
  schoolTypes: [] as string[],
  ageRanges: [] as string[],
}

export type EventFilterOptions = typeof EVENT_FILTER_FALLBACKS
export type SchoolFilterOptions = typeof SCHOOL_FILTER_FALLBACKS
