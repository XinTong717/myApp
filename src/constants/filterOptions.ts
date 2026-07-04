export const ALL_FILTER = '全部'
export const EVENT_DEFAULT_STATUS_FILTER = 'recruiting'

export const SCHOOL_TYPE_OPTIONS = [
  '学习成长社区',
  '学校',
  '华德福学校',
  '蒙台梭利学校',
  '民主学校',
  '自然教育',
  '项目制学习',
  '营地/游学',
  '其他',
]

export const BOARDING_TYPE_OPTIONS = [
  '走读',
  '寄宿',
  '混合',
  '待确认',
]

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

export type SchoolProvinceStat = {
  province: string
  count: number
}

const SCHOOL_PROVINCE_FALLBACKS = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
  '香港', '澳门', '台湾',
]

export const SCHOOL_FILTER_FALLBACKS = {
  allOption: ALL_FILTER,
  listLimit: 100,
  maxDynamicOptions: 80,
  provinces: SCHOOL_PROVINCE_FALLBACKS,
  provinceStats: [] as SchoolProvinceStat[],
  schoolTypes: [] as string[],
  ageRanges: [] as string[],
}

export type EventFilterOptions = typeof EVENT_FILTER_FALLBACKS
export type SchoolFilterOptions = typeof SCHOOL_FILTER_FALLBACKS
