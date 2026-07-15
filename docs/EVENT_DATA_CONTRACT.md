# 活动数据契约

活动列表、活动卡片和活动详情以 CloudBase `events` 集合中的结构化字段为唯一事实源。前端不得从 `description`、标题或活动类型推测参与对象、年龄、周期或费用。

## 核心字段

- `event_types: string[]`：用户可见的活动类型，可多选。
- `event_type: string`：用于图标、筛选和旧数据兼容的主类型代码，由发布流程从 `event_types` 派生。
- `audience_who: string[]`：参与对象。空数组或缺失表示未注明。
- `min_age_requirement / max_age_requirement: string`：参与年龄。两者均为空表示未注明或不适用。
- `is_recurring: boolean` 与 `recurrence_pattern: string`：是否周期性及周期说明。
- `status: recruiting | ended`：报名状态。周期性不是报名状态。

## 显示规则

活动卡片固定展示时间、地点、费用和一行参与信息：

- 年龄已填写：显示“参与年龄”。
- 年龄未填写：改为显示“参与对象”。
- 年龄和参与对象都未填写：显示“参与对象：未注明”。

详情页同时展示参与对象和年龄区间，缺失值如实显示“未注明”。

## 类型映射

- 工作坊 → `workshop`
- 营期/短期营 → `camp`
- 项目招募 → `community_program`
- 圆桌讨论 → `discussion`
- 交友聚会 → `meetup`
- 家庭活动 → `family`
- 一对一 → `one_on_one`
- 团体 → `group`
- 其他及“其他：...” → `other`

旧记录缺少 `event_types` 时，可以暂时用 `event_type` 转换为显示文案；一旦补齐 `event_types`，页面必须优先显示数据库数组。
