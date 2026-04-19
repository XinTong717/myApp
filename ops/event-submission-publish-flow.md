# Event submissions → events 发布流程（管理员手动审核版）

Last updated: 2026-04-19

## 目标

当前活动提交通道的设计是：
- 用户向 CloudBase `event_submissions` 提交活动
- 管理员人工审核
- 审核通过后，**手动发布到 MemFire `events`**
- 发布完成后，再回写 `event_submissions` 的状态，避免重复发布

这个流程刻意保持**人工策展**，而不是自动放行。

原因：
1. 当前产品不是开放公告墙
2. 当前前端 `events` 仍然读取 **MemFire `events`**，不是 CloudBase submissions
3. 当前没有管理员后台，也没有自动审核置信度足够高的 publish pipeline

---

## 当前涉及的两套数据源

### CloudBase: `event_submissions`
用于承接用户提交、审核、去重、限流和审核备注。

当前 `submitEvent` 会写入这些字段：
- `openid`
- `submitterDisplayName`
- `submitterRoles`
- `submitterCity`
- `normalizedKey`
- `title`
- `province`
- `city`
- `eventType`
- `audience`
- `startTime`
- `endTime`
- `isOnline`
- `location`
- `fee`
- `organizer`
- `officialUrl`
- `signupNote`
- `description`
- `status`
- `adminNote`
- `reviewedAt`
- `reviewedBy`
- `createdAt`
- `updatedAt`

### MemFire: `events`
当前小程序活动页真实读取来源。

当前 `events` 结构按现有前端读取逻辑至少需要：
- `id`
- `title`
- `event_type`
- `description`
- `start_time`
- `end_time`
- `location`
- `fee`
- `status`
- `organizer`
- `is_online`
- `contact_info`

---

## 推荐的管理员审核状态机

### `event_submissions.status`
建议使用以下状态：
- `pending`：待审核
- `rejected`：不发布
- `merged`：已发布到 MemFire `events`

### 为什么暂时不强调 `approved`
如果你现在没有单独的“待发布”批处理池，`approved` 这个中间状态会制造额外歧义：
- 到底已经上线了吗？
- 还是只是看起来可以发，但还没发？

所以当前最小清晰方案是：
- 要么 `pending`
- 要么 `rejected`
- 要么 `merged`

如果以后你想做双人审核或定时批量发布，再引入 `approved`。

---

## 审核决策树

管理员看到一条 `pending` submission 后，按这个顺序判断：

### Step 1. 是否是公开可验证活动
满足任一条件更适合发布：
- 有官网/公开链接
- 有明确主办方
- 有清晰时间
- 活动内容不是纯私聊邀约

如果不满足：
- `status = rejected`
- `adminNote` 写明：如“缺少公开链接和可验证主办方”

### Step 2. 是否符合产品边界
优先发布：
- 家长 / 教育者相关活动
- 学习、共学、工作坊、讨论、项目说明会、线下聚会
- 有明确地点或线上说明

谨慎或不发布：
- 强营销导流
- 纯私密招生
- 明显与自由学社 / 可雀用户无关
- 含未公开未成年人隐私信息

### Step 3. 是否与现有活动重复
若和已上线 `events` 高度重复：
- 不再新建 event
- 在 `adminNote` 里写“已与 event #xx 合并/重复”
- `status = merged`

### Step 4. 是否值得进入公开活动页
即便信息真实，也不是所有真实活动都值得进首页。
公开活动页优先展示：
- 对外部用户有发现价值
- 时间、地点、主题比较明确
- 有一定公共性，而不是只对小圈子有效

---

## 字段映射方案

## 总原则
CloudBase submission 是“用户原始提交层”，MemFire `events` 是“公开展示层”。

**不要机械复制。**
管理员发布时应该做一次轻量编辑和标准化。

---

## 一对一 / 规则映射表

| CloudBase `event_submissions` | MemFire `events` | 规则 |
|---|---|---|
| `title` | `title` | 基本一对一；发布前可微调标题使其更像公开活动标题 |
| `eventType` | `event_type` | 需要归一到当前前端支持的内部枚举，见下表 |
| `description` | `description` | 作为主体文案；可拼接 `audience`、`signupNote`、`officialUrl` 成更完整详情 |
| `startTime` | `start_time` | 直接映射，使用 ISO 时间 |
| `endTime` | `end_time` | 直接映射；为空可留空 |
| `location` / `province` / `city` / `isOnline` | `location` | 线上活动优先写平台说明；线下活动优先写具体地点，否则用“省市”兜底 |
| `fee` | `fee` | 直接映射；没有就写空或“免费” |
| 管理员判断 | `status` | 不建议直接照 submission 填；按发布时间逻辑决定 |
| `organizer` | `organizer` | 直接映射；必要时可标准化主办方名 |
| `isOnline` | `is_online` | 直接映射 |
| `officialUrl` + `signupNote` | `contact_info` | 组合成公开可复制的报名/联系信息，不写私人联系方式 |

---

## `event_type` 归一规则

当前前端更稳定支持的内部值是：
- `night_chat`
- `parent_observer`
- `community_program`
- `workshop`
- `meetup`

而用户提交页的 `eventType` 是更面向人的中文标签。

### 推荐归一表

| 提交值 `eventType` | 发布到 `events.event_type` |
|---|---|
| `工作坊` | `workshop` |
| `线下聚会` | `meetup` |
| `线上活动` | `meetup` |
| `家庭活动` | `meetup` |
| `项目招募` | `community_program` |
| `夜聊/讨论` | `meetup`（默认） |
| `其他` | `meetup`（默认） |

### 什么时候可以用 `night_chat`
只有当管理员明确判断它是：
- 持续性的讨论系列
- 更接近“每周夜聊”这种固定品牌化形式
- 且你希望在前台用“夜聊”的视觉语义展示

否则一律默认 `meetup`，避免把普通讨论都装进 `night_chat` 这个壳里。

### 什么时候可以用 `parent_observer`
只有当活动明确是家长旁听/观察席型产品时才用。
普通家长沙龙不要硬塞这个类型。

---

## `status` 决策规则

不要把 submission 的审核状态直接等同于公开活动状态。

`events.status` 推荐这样生成：

### one-off 单次活动
- `end_time < now` → **不要发布**；通常直接拒绝或忽略
- `start_time > now` → `upcoming`
- `start_time <= now <= end_time` → `ongoing`

### 持续招募 / 长期项目
只有在管理员明确知道它是长期开放招募时才用：
- `recruiting`

### recurring
只给真正的固定系列活动使用，例如你自己的夜聊系列。
普通用户提交活动不建议随意用 `recurring`。

---

## `description` 组装规则

MemFire `events.description` 是面向前台详情页的展示字段。
推荐不要只塞用户原文，而是做一次轻量结构化整理。

### 推荐模板

```text
适合人群：{audience 或“未注明”}

活动简介：
{description}

报名方式：
{signupNote 或“请查看公开链接”}

公开链接：
{officialUrl 或“未提供”}
```

### 为什么这样做
因为当前详情页没有单独的：
- audience 字段展示位
- officialUrl 专用展示位
- signup method 专用展示位

所以需要把这些信息折叠进 `description` 或 `contact_info`。

---

## `contact_info` 组装规则

当前详情页有一个“咨询报名”可复制字段，对应 `contact_info`。

这里必须坚持一个原则：
**只放公开信息，不放私人微信号/手机号。**

### 推荐模板

#### 情况 A：有公开链接 + 有报名说明
```text
公开链接：{officialUrl}
报名方式：{signupNote}
```

#### 情况 B：只有公开链接
```text
公开链接：{officialUrl}
```

#### 情况 C：只有报名说明
```text
报名方式：{signupNote}
```

#### 情况 D：都没有
```text
请等待更多公开信息
```

---

## `location` 组装规则

### 线上活动
优先：
1. `location` 原文，如“腾讯会议 / Zoom”
2. 没填则写 `线上`

### 线下活动
优先：
1. `location` 原文，如“杭州西湖区某空间”
2. 没填则写 `{province}{city}`

不要把“杭州 · 线上”这种混合脏格式直接写进去。

---

## 发布后的回写字段建议

当前 `submitEvent` 还没有这些字段，但管理员发布时建议顺手补到 CloudBase 文档中：
- `publishedEventId`：MemFire `events.id`
- `publishedAt`：发布时间
- `reviewedAt`：审核时间
- `reviewedBy`：审核人标识
- `adminNote`：备注
- `status = merged`

### 为什么要有 `publishedEventId`
否则之后你很难：
- 知道某条 submission 对应哪个线上 event
- 修订已发布活动
- 避免重复发布

---

## 管理员手动发布操作流（当前最小可执行版）

## A. 在 CloudBase Console 审核 submission
1. 打开 `event_submissions`
2. 筛选 `status = pending`
3. 检查：
   - 标题
   - 时间
   - 主办方
   - 是否公开可验证
   - 是否明显重复
4. 决定：发布 or 拒绝

## B. 若拒绝
直接更新该行：
- `status = rejected`
- `adminNote = 拒绝原因`
- `reviewedAt = 当前时间`
- `reviewedBy = 你的标识`

## C. 若发布
在 MemFire / DBeaver 中对 `events` 新增一行，填入标准化后的字段：
- `title`
- `event_type`
- `description`
- `start_time`
- `end_time`
- `location`
- `fee`
- `status`
- `organizer`
- `is_online`
- `contact_info`

### 推荐发布顺序
1. 先写 MemFire `events`
2. 确认插入成功并拿到 `id`
3. 再回 CloudBase 更新原 submission：
   - `status = merged`
   - `publishedEventId = 新 events.id`
   - `publishedAt = 当前时间`
   - `reviewedAt = 当前时间`
   - `reviewedBy = 你的标识`
   - `adminNote = 已发布到 events`

### 为什么顺序要这样
如果你先把 submission 改成 `merged`，但 MemFire 插入失败，就会出现“看起来已发，实际上没发”的脏状态。

---

## 半自动工具（已补进 repo）

当前 repo 里已经新增两类云函数，帮助你把“手动发布”变成“半自动发布”：

### 1. `getEventPublishPayload`
作用：
- 输入 `submissionId`
- 读取 CloudBase `event_submissions`
- 自动生成建议版 MemFire `events` payload
- 返回 warnings，提醒你哪些地方仍需人工判断

#### 输入
```json
{
  "submissionId": "event_submissions doc id"
}
```

#### 输出
```json
{
  "ok": true,
  "submission": {
    "_id": "...",
    "status": "pending",
    "title": "..."
  },
  "suggestedEventPayload": {
    "title": "...",
    "event_type": "meetup",
    "description": "...",
    "start_time": "...",
    "end_time": "...",
    "location": "...",
    "fee": "免费",
    "status": "upcoming",
    "organizer": "...",
    "is_online": true,
    "contact_info": "..."
  },
  "suggestedReviewUpdate": {
    "status": "merged",
    "publishedEventId": null,
    "adminNote": "已发布到 events"
  },
  "warnings": [
    "未提供公开链接，发布前请确认活动确实可公开参与"
  ]
}
```

### 2. `reviewEventSubmission`
作用：
- 发布成功后回写 CloudBase
- 拒绝 submission
- 误操作时重置回 `pending`

#### 支持的 action
- `mark_published`
- `reject`
- `reset_pending`

#### `mark_published` 输入
```json
{
  "submissionId": "...",
  "action": "mark_published",
  "publishedEventId": 123,
  "reviewedBy": "xintong",
  "adminNote": "已发布到 events"
}
```

#### `reject` 输入
```json
{
  "submissionId": "...",
  "action": "reject",
  "reviewedBy": "xintong",
  "adminNote": "缺少公开链接和可验证主办方"
}
```

#### `reset_pending` 输入
```json
{
  "submissionId": "...",
  "action": "reset_pending",
  "reviewedBy": "xintong",
  "adminNote": "回滚到待审核"
}
```

---

## 推荐的半自动操作流

### Path A. 准备发布
1. 调用 `getEventPublishPayload({ submissionId })`
2. 查看返回的：
   - `suggestedEventPayload`
   - `warnings`
3. 在 MemFire / DBeaver 里手动插入 `events`
   - 可以直接复制建议 payload 再小改

### Path B. 发布成功后回写
4. 拿到 MemFire 新生成的 `events.id`
5. 调用：
   `reviewEventSubmission({ action: 'mark_published', submissionId, publishedEventId })`
6. 这时 CloudBase 会更新：
   - `status = merged`
   - `publishedEventId`
   - `publishedAt`
   - `reviewedAt`
   - `reviewedBy`
   - `adminNote`

### Path C. 审核不通过
直接调用：
`reviewEventSubmission({ action: 'reject', submissionId, adminNote })`

### Path D. 误标或需要回滚
如果你错误地标记了状态，但尚未想好下一步：
调用：
`reviewEventSubmission({ action: 'reset_pending', submissionId })`

---

## 失败回滚规则

### 规则 1
**不要在 MemFire 插入成功之前调用 `mark_published`。**

否则会出现：
- CloudBase 里显示 `merged`
- 但 `events` 里其实没有这条记录

### 规则 2
如果 MemFire 插入失败：
- 什么都不要回写
- submission 保持 `pending`
- 修正后重新发布

### 规则 3
如果 MemFire 已插入成功，但 CloudBase 回写失败：
- 先记下 `publishedEventId`
- 重新调用 `reviewEventSubmission({ action: 'mark_published', ... })`
- 不要再往 MemFire 重复插第二条

### 规则 4
如果你误把某条 submission 标成 `merged`，但其实没成功发出去：
- 调用 `reset_pending`
- 再重新走发布流程

---

## 推荐的管理员发布 Checklist

发布前逐项确认：
- [ ] 这是公开可验证活动
- [ ] 时间不是过去时间
- [ ] 主办方明确
- [ ] 没有私人联系方式
- [ ] `event_type` 已归一
- [ ] `status` 不是机械照抄
- [ ] `description` 对外可读
- [ ] `contact_info` 可公开复制
- [ ] CloudBase 已回写 `publishedEventId`

---

## 一个具体示例

### 用户提交（CloudBase）
```json
{
  "title": "杭州家长共学夜聊：青春期与自主学习",
  "province": "浙江",
  "city": "杭州",
  "eventType": "夜聊/讨论",
  "audience": "家长",
  "startTime": "2026-05-03T12:30:00.000Z",
  "endTime": "2026-05-03T13:30:00.000Z",
  "isOnline": true,
  "location": "腾讯会议",
  "fee": "免费",
  "organizer": "自由学社杭州家长组",
  "officialUrl": "https://example.com/signup",
  "signupNote": "填写报名表后会收到会议信息",
  "description": "一个面向家长的小型线上讨论活动，交流青春期阶段的陪伴与自主学习支持。"
}
```

### 管理员发布到 MemFire `events`
```json
{
  "title": "杭州家长共学夜聊：青春期与自主学习",
  "event_type": "meetup",
  "description": "适合人群：家长\n\n活动简介：\n一个面向家长的小型线上讨论活动，交流青春期阶段的陪伴与自主学习支持。\n\n报名方式：\n填写报名表后会收到会议信息\n\n公开链接：\nhttps://example.com/signup",
  "start_time": "2026-05-03T12:30:00.000Z",
  "end_time": "2026-05-03T13:30:00.000Z",
  "location": "腾讯会议",
  "fee": "免费",
  "status": "upcoming",
  "organizer": "自由学社杭州家长组",
  "is_online": true,
  "contact_info": "公开链接：https://example.com/signup\n报名方式：填写报名表后会收到会议信息"
}
```

### 然后回写 CloudBase submission
```json
{
  "status": "merged",
  "publishedEventId": 123,
  "publishedAt": "serverDate()",
  "reviewedAt": "serverDate()",
  "reviewedBy": "xintong",
  "adminNote": "已发布到 events"
}
```

---

## 不建议现在就做的事情

- 不建议让 `event_submissions` 自动同步到 `events`
- 不建议 submission 审核通过后自动上线
- 不建议在没有 `publishedEventId` 的情况下长期手工维护
- 不建议把私人报名方式复制到 `contact_info`

---

## 结论

当前最稳的管理员发布路径是：

`event_submissions.pending`
→ 调用 `getEventPublishPayload` 生成建议版 payload
→ 人工确认后插入 MemFire `events`
→ 成功后调用 `reviewEventSubmission(action = mark_published)` 回写 CloudBase

这条路径的核心不是“快”，而是：
- 可控
- 可追踪
- 可回滚
- 不会把活动页变成开放公告墙
- 与当前产品边界一致
