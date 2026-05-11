export const ALL_FILTER = '全部'
export const EVENT_DEFAULT_STATUS_FILTER = '未结束'

export const EVENT_FILTER_FALLBACKS = {
  eventTypes: [ALL_FILTER, '圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他'],
  audience: [ALL_FILTER, '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他'],
  minAge: [ALL_FILTER, '全年龄', '6岁+', '12岁+', '18岁+（成人活动）'],
  fee: [ALL_FILTER, '免费', '付费', '公益捐赠', '费用待确认'],
  status: [EVENT_DEFAULT_STATUS_FILTER, ALL_FILTER, 'recruiting', 'upcoming', 'ongoing', 'recurring', 'ended'],
  eventTypeValueMap: {
    工作坊: 'workshop',
    线下聚会: 'meetup',
    线上活动: 'online',
    家庭活动: 'family',
    项目招募: 'community_program',
    圆桌讨论: 'discussion',
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
