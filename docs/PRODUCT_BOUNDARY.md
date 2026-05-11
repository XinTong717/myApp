# 可雀产品边界：成员目录，不是私信社交产品

Last updated: 2026-05-11

## Current launch positioning

可雀当前不是社交私信产品，而是成年人自愿公开资料的教育探索成员目录。

平台当前不提供：

- 站内私信
- 好友申请
- 双边联络请求
- 自动撮合
- 算法匹配
- 交易担保
- 学校资质认证
- 活动安全担保

用户只能查看对方选择公开的渠道，并自行谨慎联系。

## Why this boundary matters

This boundary reduces launch risk in four places:

1. **微信审核心智更清晰**：当前是资源浏览 + 成人公开目录，不是开放社交/私信产品。
2. **未成年人相关风险更低**：平台不鼓励未成年人自行注册，不提供站内撮合，也不承诺关系匹配。
3. **运营成本更可控**：不用处理私信投诉、聊天记录取证、好友关系纠纷。
4. **MVP 更聚焦**：先验证学习社区库、活动供给、成年人目录是否有需求。

## Copy rules

Use these terms:

- 成员目录
- 同路人地图
- 公开资料
- 公开渠道
- 人工审核
- 推荐 / 纠错 / 举报

Avoid these terms unless the product intentionally adds those capabilities later:

- 私信
- 聊天
- 好友申请
- 请求连接
- 申请联系
- 自动匹配
- 智能撮合
- 关系推荐

## UI rule

Any CTA that might imply direct in-app contact should be rewritten.

Examples:

| Avoid | Use instead |
|---|---|
| 申请联系 | 查看公开资料 |
| 加好友 | 查看公开渠道 |
| 请求连接 | 查看对方选择公开的信息 |
| 匹配同路人 | 浏览同路人地图 |
| 系统推荐伙伴 | 查看同城成员目录 |

## Implementation notes

Current backend aligns with this boundary: person-to-person request actions are not registered in `appService`; member discovery remains a one-way public directory.

If future versions add messaging or connection requests, treat that as a separate product/compliance milestone, not a small UI tweak.
