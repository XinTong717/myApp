# 开发 / 核验 / 部署 SOP

这份 SOP 的目标不是“看起来差不多”，而是让每一步都能确认：小程序现在连的是哪一套环境、正在验证哪一层东西、失败时应该先查哪里。

当前架构基线：

- 小程序公共内容读取是 CloudBase-first。
- 前端通过 `src/services/cloud.ts` 调用统一云函数 `appService`。
- `getSchools`、`getSchoolDetail`、`getEvents`、`getEventDetail` 等都是 `appService` 的 action，不是独立云函数。
- `schools`、`school_locations`、`events` 是公共内容的 CloudBase 集合。
- `school_locations` 是学习社区地点真源。
- MemFire 不再是小程序公共读取链路的必需依赖。不要为了 prod 空数据去补 `MEMFIRE_API_*` env vars，除非未来明确重新引入。

---

## 一、环境 ID

| 环境 | CloudBase env id | 用途 |
|---|---|---|
| dev | `cloud1-9g8njw4c79fb1322` | 本地开发、日常调试、真机预览前验证 |
| prod | `keque-prod-v2-d8gfsxh8j16fba620` | 生产构建、正式体验版、审核版、线上环境 |

两条轴线必须分别确认：

1. **runtime env**：由 `.env.development` / `.env.production` 或 `TARO_APP_CLOUD_ENV` 注入到 `__WEAPP_CLOUD_ENV_ID__`，决定小程序运行时连哪个 CloudBase env。
2. **DevTools / CloudBase console env**：由 `project.config.json -> cloudenvironment` 和微信开发者工具环境下拉框决定，影响你正在查看、上传和部署哪个云环境。

这两个不会自动同步。每次碰 prod 前都要分别确认。

---

## 二、首次拉起项目

```bash
npm install
npm run use:devtools:dev
npm run dev:weapp:dev
```

在微信开发者工具打开 repo 根目录，不要打开 `src/` 或 `dist/`。

启动后确认控制台能看到：

```text
[cloud] runtime env = cloud1-9g8njw4c79fb1322
[cloud] runtime mode = development
```

如果 runtime env 不是 dev，先停下来排查。

---

## 三、日常开发 SOP

每次开始开发前：

```bash
git pull
npm run use:devtools:dev
npm run dev:weapp:dev
```

开发中原则：

- 改 `src/`，不要改 `dist/`。
- 改 `cloudfunctions/appService/**` 后，需要在目标环境重新部署 `appService`。
- 任何只在 DevTools / CloudBase console 做的配置变更，都不是 git 追踪内容，需要手动记录。
- 新页面必须注册到 `src/app.config.ts`。
- active submit routes 以 `pkg/...` 为准。
- 新增学习社区地点必须写 `school_locations`，不要把新地点拼进 `schools.city`。

最小回归检查：

1. 探索页正常加载。
2. 学习社区列表正常加载。
3. 活动列表正常加载。
4. 我的资料页能打开。
5. 本次改动相关页面能正常完成主路径。

---

## 四、提交前代码核验

```bash
npm run typecheck
npm run check:actions
npm run check:legal-version
npm run check:design-system
```

如果改了路由或页面注册：

- 检查 `src/app.config.ts`。
- 检查实际跳转路径。
- 检查页面物理文件是否存在。

如果改了环境相关：

- 检查 `.env.development`。
- 检查 `.env.production`。
- 检查 `project.config.json` 当前环境是否符合此刻操作目标。

如果改了云函数：

- 确认只需要部署 `appService`。
- 确认 action 已在 `cloudfunctions/appService/index.js` 的 `actionHandlers` 中可达。
- 先在 dev 用云函数测试调用对应 action。

---

## 五、dev 云函数核验

在 CloudBase console 或微信开发者工具云函数测试里，选择 dev 环境，测试 `appService`。

基础 action：

```json
{ "action": "getOpenId" }
```

通过标准：返回 `ok: true`，且包含当前测试用户的 `openid`。

公共内容 action：

```json
{ "action": "getSchools", "limit": 20 }
```

```json
{ "action": "getSchoolMarkers", "limit": 20 }
```

```json
{ "action": "getEvents", "limit": 20 }
```

```json
{ "action": "getMapUsers" }
```

通过标准：返回 `ok: true`。数组可以为空，但如果数据库已有可见数据却返回空，要查 runtime env、DevTools env、`appService` 部署、集合、权限、索引、status 字段和 `school_locations`。

提交与用户 action 至少验证：

```json
{ "action": "getProfileBootstrap" }
```

```json
{ "action": "getLegalConsentStatus" }
```

```json
{ "action": "checkAdminAccess" }
```

`saveProfile`、`submitSchool`、`submitEvent`、`reportUser` 等写操作优先用真机主路径测试，因为它们依赖 openid、legal consent、内容安全与 rate limit。

---

## 六、prod build 核验

这是确认 prod 前端产物会连到 prod，不等于已经完成上线。

```bash
npm run use:devtools:prod
rm -rf dist
npm run build:weapp:prod
grep -R "cloud1-9g8njw4c79fb1322\|keque-prod-v2-d8gfsxh8j16fba620" dist | head
```

通过标准：

- `dist/app.js` 应该出现 prod env id：`keque-prod-v2-d8gfsxh8j16fba620`。
- 如果 `dist/app.js` 仍指向 dev，说明 prod build 没吃到生产环境变量。
- `dist/project.config.json` 只代表 DevTools 默认视角，不等于 runtime 连接目标。判断 runtime 以 `dist/app.js` 和启动日志为准。

正式体验版 / 审核版 / 线上发布包只允许使用：

```bash
npm run build:weapp:prod
```

不要用裸 `npm run dev:weapp`、`npm run dev:weapp:dev` 或微信开发者工具里残留的 dev build 产物上传正式版本。

---

## 七、prod 上线前核验

### 1. runtime 核验

打开 prod build 后的小程序，确认控制台：

```text
[cloud] runtime env = keque-prod-v2-d8gfsxh8j16fba620
[cloud] runtime mode = production
```

### 2. DevTools 当前环境核验

确认 DevTools / CloudBase 当前环境下拉框也是 prod。

### 3. prod 云函数核验

prod 环境至少应存在并部署最新版本：

```text
appService
```

`getOpenId`、`getSchools`、`getEvents`、`saveProfile`、`getMapUsers` 等都应作为 `appService` action 存在，不应作为必须保留的独立云函数。

### 4. prod action smoke test

```json
{ "action": "getOpenId" }
```

```json
{ "action": "getFilterOptions" }
```

```json
{ "action": "getSchools", "limit": 20 }
```

```json
{ "action": "getSchoolMarkers", "limit": 20 }
```

```json
{ "action": "getEvents", "limit": 20 }
```

```json
{ "action": "getMapUsers" }
```

```json
{ "action": "getProfileBootstrap" }
```

admin 账号再测：

```json
{ "action": "checkAdminAccess" }
```

```json
{ "action": "listEventSubmissions", "status": "pending", "limit": 10 }
```

```json
{ "action": "listSchoolSubmissions", "status": "pending", "limit": 10 }
```

### 5. prod collection 核验

确认这些 launch collections 存在：

```text
users
safety_relations
user_reports
account_deletion_requests
legal_consents
rate_limits
schools
school_locations
school_submissions
school_corrections
events
event_submissions
event_corrections
event_interest
event_interest_counts
admin_users
admin_audit_logs
counters
client_error_logs
```

不要把这些 legacy collections 当作 launch 必需集合：

```text
connections
community_submissions
corrections
reports
```

如果 legacy collections 存在，只能在确认无 keeper data 后删除；不要用它们修 prod 空数据。

### 6. prod admin row 核验

检查 `admin_users` 中是否有当前运营账号的 prod openid，且：

```text
isActive = true
```

最低字段建议：

```json
{
  "openid": "你的 prod openid",
  "name": "Xin",
  "role": "admin",
  "isActive": true
}
```

### 7. prod 权限核验

所有 app-managed collections 都建议：

```text
所有用户不可读写
仅云函数可读写
```

尤其是：

```text
users
school_submissions
school_corrections
event_submissions
event_corrections
user_reports
account_deletion_requests
legal_consents
admin_users
admin_audit_logs
rate_limits
counters
client_error_logs
```

### 8. prod 索引核验

按 `docs/CLOUDBASE_INDEXES.md` 创建或核对索引。优先确认：

```text
schools
school_locations
events
users
school_submissions
event_submissions
school_corrections
event_corrections
rate_limits
legal_consents
admin_users
admin_audit_logs
safety_relations
event_interest
event_interest_counts
user_reports
account_deletion_requests
```

### 9. counters/events 核验

如果环境里已有 canonical events，确认：

```text
collection: counters
doc id: events
current: max(existing events.id)
name: events
```

如果当前最大 `events.id` 是 `70`，`current` 应设为 `70`，不是 `71`。发布流程会先自增，再使用新 id。

---

## 八、prod 最小 smoke test

在 prod 环境里至少点通：

1. 探索地图能加载。
2. 全国视图能显示学习社区地点。
3. 全国视图能显示同路人 province summary。
4. 选中省份后，同路人 city / province cluster 正常。
5. 学习社区列表能加载。
6. 学习社区筛选能加载正确结果。
7. 学习社区详情页能打开，地点列表正常。
8. 活动列表能加载。
9. 活动详情页能打开。
10. “我的”页能读取资料。
11. 未同意协议时，保存资料、提交活动、提交学校、举报、拉黑、收藏会被 legal gate 拦住。
12. 同意协议后，保存资料成功。
13. 推荐新学习社区页面能打开并可提交。
14. 推荐新活动页面能打开并可提交。
15. 我感兴趣按钮能成功 toggle。
16. 举报用户后，数据写入 `user_reports`。
17. admin 入口只在正确账号出现。
18. 活动审核台能读取 `event_submissions`。
19. 学习社区审核台能读取 `school_submissions`。
20. admin 一键发布活动后，`events` 出现新记录，`event_submissions` 回写 merged。

---

## 九、部署 `appService` SOP

当你改了 `cloudfunctions/appService/**`，并准备推到 prod：

```bash
npm run use:devtools:prod
```

然后：

1. 确认 DevTools 当前环境下拉框是 prod。
2. 对 `appService` 执行“上传并部署：云端安装依赖”。
3. 部署后检查 `appService` 更新时间。
4. 立即调用基础 action。

建议部署后先测：

```json
{ "action": "getOpenId" }
```

```json
{ "action": "getSchools", "limit": 20 }
```

```json
{ "action": "getEvents", "limit": 20 }
```

```json
{ "action": "getMapUsers" }
```

绝对不要：

- 在没确认 DevTools 环境的情况下直接部署。
- 把“我 build 了 prod”误当成“我部署到了 prod”。
- 把 `getSchools` / `getEvents` 等 action 当成独立云函数去补部署。
- 为了修 prod 空数据盲目补 MemFire env vars。
- 为了让举报数据出现而新建 `reports`；launch 集合应使用 `user_reports`。

---

## 十、常见故障排查

### 情况 1：页面能打开但数据空

优先查：

1. runtime env 是否正确。
2. DevTools 当前环境是否正确。
3. prod `appService` 是否为最新部署。
4. 对应 CloudBase 集合是否存在并有数据。
5. 集合权限是否允许云函数读写。
6. `schools` / `events` 文档 status 是否是可见状态，或至少不是 `deleted` / `removed` / `archived`。
7. `school_locations` 是否存在且状态可见。
8. 必要索引是否已创建。

### 情况 2：函数部署了但页面像没生效

优先查：

1. 是不是部署到了 dev。
2. 小程序运行时是不是仍连着 dev。
3. 是否打开了旧缓存页面。
4. 是否需要重新 build 或删除 `dist`。

### 情况 3：控制台数据和页面对不上

优先怀疑：

```text
runtime env 和 DevTools / CloudBase console 当前环境没对齐
```

### 情况 4：学习社区列表有数据，但详情或地图没有地点

优先查：

1. `school_locations` 是否存在对应 `school_id`。
2. `school_locations.status` 是否不是 `deleted` / `removed` / `archived`。
3. 是否错误地把新地点写进了 `schools.city`，而没有写 `school_locations`。

### 情况 5：全国地图没有同路人 marker

优先查：

1. `getMapUsers` 是否返回 `provinceStats`。
2. explore 前端是否把 `provinceStats` 渲染成 `user_cluster`。
3. 是否被 selectedProvince 条件误挡住。
4. 用户是否关闭了 `isVisibleOnMap`。
5. 当前用户是否被对方拉黑，或自己拉黑/静音了对方。

### 情况 6：举报显示成功，但后台找不到

优先查：

1. `user_reports` 集合是否存在。
2. `user_reports` 权限是否为仅云函数可写。
3. 真机是否连接 prod runtime env。
4. 不要去 `reports` 找 launch 数据；`reports` 是 legacy / 错误集合名。

---

## 十一、最短口令版

开发：

```bash
npm run use:devtools:dev
npm run dev:weapp:dev
```

prod build 核验：

```bash
npm run use:devtools:prod
rm -rf dist
npm run build:weapp:prod
grep -R "cloud1-9g8njw4c79fb1322\|keque-prod-v2-d8gfsxh8j16fba620" dist | head
```

prod appService 验证：

```json
{ "action": "getSchools", "limit": 20 }
```

```json
{ "action": "getEvents", "limit": 20 }
```

```json
{ "action": "getMapUsers" }
```

举报验证：

```text
真机举报用户后，检查 user_reports，而不是 reports。
```
