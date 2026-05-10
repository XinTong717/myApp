export const SAFETY_CODE_MESSAGES = {
  TARGET_NOT_FOUND: '找不到该用户',
  SELF_ACTION_NOT_ALLOWED: '不能对自己执行这个操作',
  SELF_REPORT_NOT_ALLOWED: '不能举报自己',
  INVALID_ACTION: '无效操作',
  INVALID_REASON: '举报原因不合法',
  NOTE_TOO_LONG: '举报说明不能超过1000字',
  DUPLICATE_REPORT: '24小时内你已经举报过该用户，无需重复提交',
  CONTENT_SECURITY_BLOCKED: '举报说明包含不合规信息，请修改后重试',
  CONTENT_SECURITY_FAILED: '举报说明审核失败，请稍后重试',
  MANAGE_SAFETY_FAILED: '操作失败，请稍后重试',
  REPORT_USER_FAILED: '举报失败，请稍后重试',
  BAD_REQUEST: '参数有误，请稍后重试',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
} as const

export const REPORT_CODE_MESSAGES = {
  TARGET_REQUIRED: '缺少目标用户',
  INVALID_REASON: '举报原因不合法',
  NOTE_TOO_LONG: '举报说明不能超过1000字',
  TARGET_NOT_FOUND: '找不到该用户',
  SELF_REPORT_NOT_ALLOWED: '不能举报自己',
  DUPLICATE_REPORT: '24小时内你已经举报过该用户，无需重复提交',
  CONTENT_SECURITY_BLOCKED: '举报说明包含不合规信息，请修改后重试',
  CONTENT_SECURITY_FAILED: '举报说明审核失败，请稍后重试',
  REPORT_USER_FAILED: '举报失败，请稍后重试',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
} as const

export const EVENT_CODE_MESSAGES = {
  BAD_REQUEST: '活动参数有误',
  TOGGLE_EVENT_INTEREST_FAILED: '操作失败，请稍后重试',
  GET_EVENT_INTEREST_INFO_FAILED: '读取感兴趣信息失败',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
} as const
