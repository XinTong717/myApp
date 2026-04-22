export const REQUEST_CODE_MESSAGES = {
  TARGET_REQUIRED: '缺少目标用户',
  PROFILE_REQUIRED: '请先填写你的资料',
  TARGET_NOT_FOUND: '找不到该用户',
  SELF_REQUEST_NOT_ALLOWED: '不能给自己发联络请求',
  TARGET_PAUSED_REQUESTS: '对方当前暂停接收联络',
  YOU_BLOCKED_TARGET: '你已拉黑该用户，需先解除拉黑',
  TARGET_BLOCKED_YOU: '当前无法向该用户发起联络',
  REQUEST_ALREADY_PENDING: '你已经发送过请求了，等待对方回应',
  REVERSE_PENDING_EXISTS: '对方已经向你发起请求，请先去处理联络动态',
  ALREADY_CONNECTED: '你们已经是联络人了',
  DAILY_LIMIT_REACHED: '24小时内发起联络次数过多，请稍后再试',
  SAME_TARGET_LIMIT_REACHED: '24小时内你已多次尝试联系该用户，请稍后再试',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
} as const

export const CONNECTION_CODE_MESSAGES = {
  BAD_REQUEST: '参数有误，请稍后重试',
  CONNECTION_NOT_FOUND: '这条联络记录不存在或已失效',
  FORBIDDEN: '你没有权限执行这个操作',
  INVALID_ACTION: '操作类型不合法',
  INVALID_STATUS: '当前状态下无法执行这个操作',
  REQUEST_ALREADY_PROCESSED: '该请求已处理过了',
  GET_MY_REQUESTS_FAILED: '读取联络动态失败',
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
} as const

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
