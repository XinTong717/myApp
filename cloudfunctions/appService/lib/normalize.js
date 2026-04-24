const ROLE_WHITELIST = ['家长', '教育者', '同行者']
const CHILD_AGE_WHITELIST = ['学龄前', '小学阶段', '中学阶段']
const CHILD_STATUS_WHITELIST = ['寻找学习社区', '寻找同伴连接', '寻找项目活动', '寻找家庭支持', '自主探索中']

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const text = String(value || '').trim()
  if (!text) return []
  return text.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean)
}

function normalizeRoles(roles) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => String(role).trim())
    .filter(Boolean)
    .map((role) => (role === '其他' ? '同行者' : role))
    .filter((role) => ROLE_WHITELIST.includes(role))
}

function mergeOtherOption(values, otherText) {
  const filtered = (Array.isArray(values) ? values : []).filter((item) => item !== '其他')
  const text = String(otherText || '').trim()
  if (text) filtered.push(`其他：${text}`)
  return filtered
}

function stringifyLabels(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).join(' / ')
}

function validateLength(label, value, max) {
  const text = String(value || '')
  if (text.length > max) return `${label}不能超过${max}字`
  return ''
}

function normalizeProfile(profile) {
  if (!profile) return null
  return {
    displayName: String(profile.displayName || '').trim(),
    gender: String(profile.gender || '').trim(),
    ageRange: profile.ageRange === '18岁以下' ? '' : String(profile.ageRange || '').trim(),
    roles: normalizeRoles(profile.roles),
    province: String(profile.province || '').trim(),
    city: String(profile.city || '').trim(),
    wechatId: String(profile.wechatId || '').trim(),
    allowIncomingRequests: profile.allowIncomingRequests !== false,
    isVisibleOnMap: profile.isVisibleOnMap !== false,
    childAgeRange: normalizeStringArray(profile.childAgeRange).filter((item) => CHILD_AGE_WHITELIST.includes(item)),
    childDropoutStatus: normalizeStringArray(profile.childDropoutStatus).filter((item) => CHILD_STATUS_WHITELIST.includes(item)),
    childInterests: String(profile.childInterests || '').trim(),
    eduServices: String(profile.eduServices || '').trim(),
    companionContext: String(profile.companionContext || '').trim(),
    bio: String(profile.bio || '').trim(),
    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,
  }
}

module.exports = {
  ROLE_WHITELIST,
  CHILD_AGE_WHITELIST,
  CHILD_STATUS_WHITELIST,
  normalizeStringArray,
  normalizeRoles,
  mergeOtherOption,
  stringifyLabels,
  validateLength,
  normalizeProfile,
}
