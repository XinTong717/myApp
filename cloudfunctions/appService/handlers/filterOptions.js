const { ok, resolveRequestId } = require('../lib/response')

const EVENT_FILTER_OPTIONS = {
  eventTypes: ['全部', '圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他'],
  audience: ['全部', '家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他'],
  minAge: ['全部', '全年龄', '6岁+', '12岁+', '18岁+（成人活动）'],
  fee: ['全部', '免费', '付费', '公益捐赠', '费用待确认'],
  status: ['未结束', '全部', 'recruiting', 'upcoming', 'ongoing', 'recurring', 'ended'],
  eventTypeValueMap: {
    工作坊: 'workshop',
    线下聚会: 'meetup',
    线上活动: 'online',
    家庭活动: 'family',
    项目招募: 'community_program',
    圆桌讨论: 'discussion',
  },
}

const SCHOOL_FILTER_OPTIONS = {
  allOption: '全部',
  listLimit: 200,
  maxDynamicOptions: 16,
}

async function getFilterOptions(event) {
  const requestId = resolveRequestId('filter-options', event)
  return ok(requestId, {
    event: EVENT_FILTER_OPTIONS,
    school: SCHOOL_FILTER_OPTIONS,
  })
}

module.exports = {
  getFilterOptions,
}
