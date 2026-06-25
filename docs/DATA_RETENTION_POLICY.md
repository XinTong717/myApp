# 可雀 数据保留策略与自动化（Data Retention Policy & Automation）

Created: 2026-06-24  
Owner: 杭州可雀科技有限责任公司  
Status: policy record and implementation contract  
Target implementation: `cloudfunctions/retentionJob/`  
Target policy-as-code: `cloudfunctions/retentionJob/retention.config.js`

本文是“保留什么数据、保留多久、到期怎么处理、怎么自动执行、怎么安全运维”的主文档真源。它取代 `docs/SCHEMA.md` 中 “Retention follow-up” 的占位说明。

重要说明：截至本文创建时，当前仓库尚未包含 `cloudfunctions/retentionJob/`。本文先作为产品、合规、工程的共同策略留档。后续实现定时云函数时，应让 `retention.config.js` 与本文矩阵保持一致；若代码与本文冲突，需先更新本文并在 PR/commit 中说明原因。

本文不是法律意见。正式上线或规模化运营前，应由熟悉中国个人信息保护与互联网平台合规的律师或合规顾问复核。

---

## 1. 目标与法律依据

设计目标：在不破坏安全、审计、运营能力的前提下，做到数据最小化与存储期限受控，并把用户注销的处理从纯人工变成可审计、可预演、可回滚心智的半自动流程。

依据与对齐：

- 《个人信息保护法（PIPL）》：最小必要、存储期限受控、删除请求响应、个人信息处理透明。
- 《网络安全法》《数据安全法》：安全事件、审计、日志与必要记录的可追溯。
- 微信小程序平台要求：用户可注销、可举报、可控制公开信息。
- 可雀产品边界：成年人自愿公开目录，不提供私信、好友申请、站内撮合或双边联络请求，因此 PII 面相对窄，但仍需要治理。

四种生命周期动作：

- `delete`：物理删除。用于瞬时、运维、终态噪音数据。
- `anonymize`：保留业务或安全价值，剥离能识别个人的字段，例如 openid、提交者身份、公开昵称。
- `report-only`：只统计并提醒人工，绝不自动删。用于安全、合规、待处理或高误删风险数据。
- `keep`：保留。基础设施或内容数据，按业务状态治理，而不是单纯按时间删除。

---

## 2. 当前已知数据事实

本策略基于当前代码和文档中的数据模型：

- `requestAccountDeletion` 已在用户提交注销时写入 `account_deletion_requests(status=pending)`，并立即匿名化 `users` 公开资料、隐藏地图可见性、清空联系方式。
- `getMe` 和前端资料页已开始把 `deletionStatus=pending` 或 `displayName=已注销用户` 视为“前端空资料”状态。
- `event_submissions(status=merged)` 是已发布活动联系方式的重要来源之一，不能盲删。
- `user_reports` 是举报与安全证据，不能随被举报人注销而级联删除。
- `adminMaintenance.js` 中存在 `cleanupRateLimits` / `reconcileEventInterestCounts` 维护逻辑，但当前不作为可调用的主流程依赖。后续 retentionJob 可取代 rate limit 清理，计数校准应单独接入。

---

## 3. 保留矩阵（canonical）

周期单位为天，后续自动化实现时均应可用环境变量覆盖。“分级”指自动化写入或删除的风险等级。

| 集合 / 数据 | PII | 默认保留 | 到期动作 | 目标 job | 分级 | 说明 |
|---|---|---:|---|---|---|---|
| `rate_limits` | 中 | 7 天 | delete | `rateLimits` | 低 | 瞬时限流计数，过期即清 |
| `client_error_logs` | 低 | 90 天 | delete | `clientErrorLogs` | 低 | 运维面包屑，只保留短期排错价值 |
| `event_submissions`，`status=rejected` | 高 | 90 天，自审核完成起算 | delete | `rejectedEventSubmissions` | 中 | 终态噪音 |
| `event_submissions`，`status=merged` | 高 | 保留 | keep，注销时 anonymize 提交者 | `accountDeletionCompletion` | 中 | `getEventContactInfo` 活跃依赖，不能盲删 |
| `event_submissions`，`status=pending` | 高 | 保留 | report-only | `governanceReport` | 无 | 在审队列，滞留超过 60 天提醒人工 |
| `school_submissions`，`status=rejected/duplicate` | 中 | 90 天 | delete | `rejectedSchoolSubmissions` | 中 | 终态噪音 |
| `school_submissions`，`status=processed/merged` | 中 | 保留 | keep，注销时 anonymize 提交者 | `accountDeletionCompletion` | 中 | 录入溯源，内容可保留 |
| `school_submissions`，`status=pending` | 中 | 保留 | report-only | `governanceReport` | 无 | 滞留超过 60 天提醒人工 |
| `event_interest`，`status != interested` | 中 | 90 天 | delete | `staleInterestToggles` | 中 | 已取消兴趣或失效行 |
| `event_interest`，`status=interested` | 中 | 账号存续 | keep，注销级联 delete | `accountDeletionCompletion` | 高 | 有效收藏，随账号删除 |
| `school_corrections` / `event_corrections` | 中 | 180 天 | report-only，注销时 anonymize | `governanceReport` | 无 | 无稳定终态字段，避免误删未处理反馈 |
| `user_reports` | 高 | 365 天 | report-only | `governanceReport` | 无 | 安全和合规证据，到期只提醒人工评估 |
| `account_deletion_requests`，`status=pending` | 高 | 宽限 30 天 | 级联完成或撤回 | `accountDeletionCompletion` | 高 | 删除权兑现核心流程 |
| `account_deletion_requests`，`status=cancelled_by_reactivation` | 高 | 1095 天 | delete 或最小化后保留 | `completedDeletionRequestArchival` | 中 | 证明用户曾撤回或重新激活 |
| `account_deletion_requests`，`status=completed` | 高，已最小化 | 1095 天 | delete | `completedDeletionRequestArchival` | 中 | 履行删除的合规凭证 |
| `users`，active | 高 | 账号存续 | keep | 无 | 无 | 当前资料主档 |
| `users`，注销已匿名化 | 高残留 | 宽限 30 天 | delete，或早期阶段仅保持匿名化 | `accountDeletionCompletion` | 高 | 正式自动化前，不建议无 dry-run 直接硬删 |
| `legal_consents` | 高 | 随账号 | 注销级联 delete | `accountDeletionCompletion` | 高 | 账号注销后随账号清除；若需证明历史同意，保留最小化审计摘要 |
| `safety_relations` | 中 | 随账号 | owner 或 target 注销时 delete | `accountDeletionCompletion` | 高 | 拉黑/静音关系不应长期挂在已删除账号上 |
| `admin_audit_logs` | 中 | 730 天 | report-only | `governanceReport` | 无 | launch 期间绝不自动删 |
| `schools` / `school_locations` / `events` | 低 | 按 status | keep | 无 | 无 | 内容库，暂不按时间清 |
| `counters` / `admin_users` / `event_interest_counts` | 低 | 永久 | keep | 无 | 无 | 基础设施或物化数据 |
| `retention_runs` | 低 | 730 天 | delete 或归档 | `retentionRunLogs` | 低 | 保留自动化运行记录 |

---

## 4. 账号注销级联（删除权兑现）

这是策略里最敏感的部分，对应目标 job：`accountDeletionCompletion` 和 `purgeAccount()`。

### 4.1 时间线

1. 用户在“我的 → 隐私设置”提交注销。
2. `requestAccountDeletion` 立即执行：公开资料匿名化为“已注销用户”、`isVisibleOnMap=false`、清空联系方式、清空城市和角色、写入一条 `account_deletion_requests(status=pending)`。
3. 进入 30 天宽限期。宽限期允许用户误操作恢复，也允许管理员人工兜底。
4. 宽限期内用户重新填写资料并保存：
   - `users.deletionStatus` 清空。
   - `users.deletionRequestedAt` 清空。
   - 最新 pending 注销工单应改为 `cancelled_by_reactivation`。
   - 历史注销工单不删除。
5. 宽限期满且仍为 pending：`retentionJob` 进入级联清除流程。

### 4.2 宽限期内重新激活

用户重新填写资料并保存后，只代表当前账号恢复使用，不代表历史注销申请消失。

推荐写入：

```json
{
  "deletionStatus": "",
  "deletionRequestedAt": null,
  "reactivatedAt": "serverDate"
}
```

同时更新对应 `account_deletion_requests` 最新 pending 行：

```json
{
  "status": "cancelled_by_reactivation",
  "cancelledAt": "serverDate",
  "updatedAt": "serverDate",
  "adminNote": "User reactivated account by saving a new profile."
}
```

### 4.3 宽限期满后的级联处理

| 数据 | 处理 |
|---|---|
| `users` 主档 | 正式策略：硬删。上线早期也可先只保持匿名化，等 retentionJob 验证稳定后开启硬删。 |
| `event_interest` / `rate_limits` / `legal_consents` | 按 openid 硬删。 |
| `safety_relations` | ownerOpenid 或 targetOpenid 任一匹配该 openid，硬删。 |
| `event_submissions`，pending/rejected | 硬删。 |
| `event_submissions`，merged | 仅匿名化提交者身份，保留已发布活动内容，打 `submitterDeletionPurgedAt` 标记。 |
| `school_submissions`，非保留态 | 硬删。 |
| `school_submissions`，processed/merged | 匿名化提交者身份。 |
| `school_corrections` / `event_corrections` | 匿名化 openid 和提交者身份，保留内容供质量治理。 |
| `user_reports` | 不动。按 365 天 report-only 单独治理。 |
| `account_deletion_requests` 当前行 | 标记 `completed`，`handledBy=retention-job`，最小化自身 PII，保留时间戳和 purgeSummary。 |

### 4.4 为什么 merged 活动投稿只匿名化不删

`event_submissions(status=merged)` 可能是已发布活动联系方式的数据源。盲删会造成线上活动失联。并且组织者联系方式可能是用户推荐的第三方公开活动信息，不一定是注销用户本人 PII。稳妥折中是：剥离提交者身份，保留内容和联系方式，打标交人工复核。

### 4.5 为什么 user_reports 不随账号注销删除

举报记录是安全与合规证据。被举报人或举报人注销后，前台不展示个人身份，但后台证据链需要按独立周期治理。到 365 天阈值只 report-only，不自动删除。

---

## 5. 自动化架构

目标结构：

```text
微信云开发定时触发器，每日 03:00 北京时间
        |
        v
cloudfunctions/retentionJob/index.js     入口：解析 dry-run / jobs，编排
        |
        |-- retention.config.js           策略真源：周期、上限、开关
        |-- jobs.js                       各 job 实现，含账号级联
        |-- lib/sweep.js                  通用分页、删除、匿名化，dry-run 感知
        |
        v
retention_runs                            完整运行记录
admin_audit_logs                          一条审计记录，action=retention_job_run
```

为什么独立成 `retentionJob` 而不塞进 `appService`：

- 定时维护与用户请求是不同失败域，不应共享上线节奏和风险。
- 清理 job 有更高误删风险，应默认 dry-run 并独立部署。
- 一个失控的清理 bug 不应影响用户关键路径。

---

## 6. 安全姿态（三重保险）

1. 默认 dry-run：不设环境变量时只统计和写报告，不删数据。只有 `RETENTION_DRY_RUN=false` 才真删。
2. 账号级联额外开关：即使 dry-run 关闭，账号注销级联仍需 `RETENTION_ENABLE_ACCOUNT_PURGE=true` 才执行。否则只报告 `pendingPastGrace`。
3. 每次运行硬上限：`RETENTION_MAX_DOCS_PER_JOB` 默认 2000，`RETENTION_MAX_ACCOUNTS_PER_RUN` 默认 50。超出则返回 `hasMore=true`，下次继续。

附加规则：

- 单文档删除或更新失败只记录错误，不中断整个 job。
- report-only 类 job 物理上不含删除写操作。
- 高风险 job 首次上线必须限制 `RETENTION_MAX_ACCOUNTS_PER_RUN=1`。
- 所有执行结果必须写入 `retention_runs`。

---

## 7. 配置参考（环境变量）

| 环境变量 | 默认 | 作用 |
|---|---:|---|
| `RETENTION_DRY_RUN` | 未设即 true | 设为 `false` 才真正删除或匿名化 |
| `RETENTION_ENABLE_ACCOUNT_PURGE` | false | 设为 `true` 才执行账号注销级联 |
| `RETENTION_RATE_LIMITS_DAYS` | 7 | `rate_limits` 保留天数 |
| `RETENTION_CLIENT_ERROR_LOGS_DAYS` | 90 | `client_error_logs` 保留天数 |
| `RETENTION_REJECTED_SUBMISSIONS_DAYS` | 90 | 被拒或重复提交保留天数 |
| `RETENTION_STALE_INTEREST_DAYS` | 90 | 失效兴趣行保留天数 |
| `RETENTION_ACCOUNT_GRACE_DAYS` | 30 | 注销宽限期 |
| `RETENTION_DELETION_REQUEST_DAYS` | 1095 | 已完成或已撤回注销工单保留天数 |
| `RETENTION_USER_REPORTS_DAYS` | 365 | 举报老化阈值，仅上报 |
| `RETENTION_CORRECTIONS_DAYS` | 180 | 纠错老化阈值，仅上报 |
| `RETENTION_AUDIT_LOGS_DAYS` | 730 | 审计老化阈值，仅上报 |
| `RETENTION_STALE_PENDING_DAYS` | 60 | 滞留待审提醒阈值 |
| `RETENTION_BATCH_SIZE` | 200 | 单页批量 |
| `RETENTION_MAX_DOCS_PER_JOB` | 2000 | 单 job 单次处理上限 |
| `RETENTION_MAX_ACCOUNTS_PER_RUN` | 50 | 单次处理注销账号上限 |

---

## 8. 目标 jobs

### `rateLimits`

- 集合：`rate_limits`
- 条件：`updatedAt < now - RETENTION_RATE_LIMITS_DAYS`
- 动作：delete
- 风险：低

### `clientErrorLogs`

- 集合：`client_error_logs`
- 条件：`createdAt < now - RETENTION_CLIENT_ERROR_LOGS_DAYS`
- 动作：delete
- 风险：低

### `rejectedEventSubmissions`

- 集合：`event_submissions`
- 条件：`status=rejected` 且审核完成时间或更新时间超过阈值
- 动作：delete
- 风险：中
- 禁止：不得删除 `status=merged`

### `rejectedSchoolSubmissions`

- 集合：`school_submissions`
- 条件：`status in rejected, duplicate` 且审核完成时间或更新时间超过阈值
- 动作：delete
- 风险：中
- 禁止：不得删除 `status=processed/merged`

### `staleInterestToggles`

- 集合：`event_interest`
- 条件：`status != interested` 且更新时间超过阈值
- 动作：delete
- 风险：中

### `accountDeletionCompletion`

- 集合：`account_deletion_requests` 及关联集合
- 条件：`status=pending` 且 `createdAt < now - RETENTION_ACCOUNT_GRACE_DAYS`
- 动作：级联 delete / anonymize / completed
- 风险：高
- 额外开关：`RETENTION_ENABLE_ACCOUNT_PURGE=true`

### `completedDeletionRequestArchival`

- 集合：`account_deletion_requests`
- 条件：`status in completed, cancelled_by_reactivation` 且超过 `RETENTION_DELETION_REQUEST_DAYS`
- 动作：delete 或最小化后保留摘要
- 风险：中

### `governanceReport`

- 集合：多个
- 条件：滞留 pending、老化 reports、老化 corrections、老化 audit logs
- 动作：report-only
- 风险：无删除风险

---

## 9. 集合与索引准备

### 新增集合：`retention_runs`

在 dev 和 prod 各创建：

```text
权限：所有用户不可读写，仅云函数可读写
建议索引：createdAt DESC
```

推荐字段：

```json
{
  "dryRun": true,
  "jobs": ["rateLimits", "clientErrorLogs"],
  "results": [],
  "totals": {
    "matched": 0,
    "deleted": 0,
    "anonymized": 0,
    "flagged": 0,
    "errors": 0
  },
  "flags": [],
  "createdAt": "serverDate"
}
```

### 建议索引

`account_deletion_requests`：

```text
status ASC + createdAt DESC
openid ASC + createdAt DESC
status ASC + updatedAt DESC
```

`client_error_logs`：

```text
createdAt ASC
```

`rate_limits`：

```text
updatedAt ASC
action ASC + updatedAt DESC
openid ASC + action ASC
```

`users`：

```text
openid ASC
deletionStatus ASC + updatedAt DESC
isVisibleOnMap ASC + province ASC
```

`retention_runs`：

```text
createdAt DESC
dryRun ASC + createdAt DESC
```

---

## 10. 部署与上线 runbook

### 10.1 第一阶段：只建文档与集合

1. 合并本文。
2. 在 dev/prod 创建 `retention_runs`。
3. 不部署任何清理代码。
4. 人工继续用 `ACCOUNT_DELETION_ADMIN_SOP.md` 处理注销申请。

### 10.2 第二阶段：部署 retentionJob，默认 dry-run

```bash
npm run use:devtools:dev
# 微信开发者工具 → 云函数 → retentionJob → 上传并部署：云端安装依赖
```

云函数测试面板调用：

```json
{ "dryRun": true }
```

检查：

- 每个 job 的 `matched` / `wouldDelete` 是否符合预期。
- `governanceReport.flags` 是否有需要人工处理的项。
- `accountDeletionCompletion` 是否因为未开 `RETENTION_ENABLE_ACCOUNT_PURGE` 而跳过，这是预期。

### 10.3 第三阶段：低风险删除灰度

设置：

```text
RETENTION_DRY_RUN=false
RETENTION_ENABLE_ACCOUNT_PURGE=false
```

先只跑：

```json
{ "dryRun": false, "jobs": ["rateLimits", "clientErrorLogs"] }
```

核对 `retention_runs.totals.deleted` 与实际集合减少量一致。

### 10.4 第四阶段：账号注销级联

1. dry-run：

```json
{ "dryRun": true, "jobs": ["accountDeletionCompletion"] }
```

2. 设置：

```text
RETENTION_ENABLE_ACCOUNT_PURGE=true
RETENTION_MAX_ACCOUNTS_PER_RUN=1
```

3. 再 dry-run，确认 `accounts[].steps`。
4. 用一个真实且确认无误的过期注销请求做小批量执行。
5. 核对：
   - `users` 该 openid 已删或按当前阶段策略保持匿名化。
   - 关联集合已清理或匿名化。
   - `account_deletion_requests` 该行 `status=completed`。
   - `purgeSummary` 记录齐全。
   - `user_reports` 未被级联删除。

### 10.5 第五阶段：定时器

确认稳定后，`config.json` 配每日 03:00 触发。首两周每天人工抽查 `retention_runs`，稳定后每周抽查。

---

## 11. 监控与排障

每次运行必须有：

- `retention_runs` 完整结果。
- `admin_audit_logs` 一条 `action=retention_job_run`。

关注信号：

- `flags` 非空：待处理注销、滞留待审、老化举报或纠错。
- `totals.deleted` 突然异常放大：立即设回 dry-run。
- 高风险 job 有 errors：暂停 `RETENTION_ENABLE_ACCOUNT_PURGE`。

回滚原则：

- 删除不可逆。保护手段是 dry-run 默认、上限、宽限期、先低风险后高风险。
- 如出现误删风险，第一动作是移除 `RETENTION_DRY_RUN=false` 或设为非 false。
- 如果 CloudBase 数据库回收站或备份可用，按备份恢复。

误注销恢复：

- 宽限期内，把 `account_deletion_requests.status` 改为 `cancelled_by_admin` 或让用户重新保存资料触发 `cancelled_by_reactivation`。
- 宽限期满并已级联 purge 后，账号不能恢复为原状态，只能作为新资料重新创建。

---

## 12. 隐私政策建议补充

建议在隐私政策或用户注销说明中加入：

> 用户申请注销后，我们会立即清空或匿名化其公开资料，并将其从地图和成员列表中移除。为处理安全、审计、争议解决、合规义务和防滥用目的，平台可能在必要期限内保留与注销申请、举报、安全关系、操作日志相关的有限记录。用户重新填写资料并保存后，账号可重新激活，但历史注销申请记录不会因此删除。

---

## 13. 与现有文档关系

- 本文：数据保留策略与自动化设计主文档。
- `ACCOUNT_DELETION_ADMIN_SOP.md`：人工兜底 SOP，保留。
- `SCHEMA.md`：数据结构说明。其 Retention follow-up 应改为指向本文。
- `CLOUDBASE_INDEXES.md`：索引落地清单，应补入本文第 9 节建议索引。
- `PROD_LAUNCH_CHECKLIST.md`：上线前应加入 `retention_runs` 已建、retentionJob dry-run 已通过。

---

## 14. 后续可演进项

- 实现 `cloudfunctions/retentionJob/`。
- 把重新激活时的 `account_deletion_requests` 自动更新为 `cancelled_by_reactivation`。
- 把 `reconcileEventInterestCounts` 接入定时任务。它属于数据一致性，不属于保留策略，但适合和 retentionJob 共用调度架构。
- `user_reports` 到期后的匿名化自动化。目前只 report-only，等审核流稳定后再做。
- `events` / `schools` 的 archived 超长期清理。
- `flags` 非空时推送运营告警。
- 先归档后清理的冷存储链路。

---

## 15. 最小上线决策

上线前最小成熟版本：

1. 用户注销后公开资料立即清空。
2. 地图和列表立即移除。
3. 再登录显示空资料表单。
4. 重新保存资料后 `users.deletionStatus` 清空。
5. `account_deletion_requests` 不删除，后续应改为 `cancelled_by_reactivation`。
6. 暂不自动硬删账号，直到 retentionJob dry-run 至少连续 7 天数字稳定。
7. 先上线 `rateLimits` 和 `clientErrorLogs` 两个低风险 job。
8. 账号注销级联作为第二阶段，必须单账号灰度。

关键原则：前台清爽，后台有账；低风险先自动，高风险先预演；删除要慢，隐藏要快。