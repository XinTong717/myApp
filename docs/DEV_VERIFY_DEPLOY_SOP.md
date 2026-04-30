# 开发 / 核验 / 部署 SOP

这份 SOP 的目标不是“看起来差不多”，而是让你每一步都知道自己现在连的是哪一套环境、在验证哪一层东西。

当前架构基线：

- 小程序公共内容读取已经是 **CloudBase-first**。
- 前端通过 `src/services/cloud.ts` 调用统一云函数 `appService`。
- `getSchools`、`getSchoolDetail`、`getEvents`、`getEventDetail` 等都是 `appService` 的 action，不再是需要单独部署的云函数。
- `schools`、`school_locations`、`events` 是 CloudBase 集合。
- `school_locations` 是学习社区地点真源。
- MemFire 不再是小程序公共读取链路的必需依赖。不要为了 prod 上线去补 `MEMFIRE_API_*` env vars，除非未来明确重新引入。

---

## 一、环境 ID

| 环境 | CloudBase env id | 用途 |
|---|---|---|
| dev | `cloud1-9g8njw4c79fb1322` | 本地开发、日常调试、真机预览前验证 |
| prod | `keque-prod-d5gc6ylp793fabaea` | 生产构建、正式体验版/线上环境 |

记住两条轴线：

1. **runtime env**：由 `.env.development` / `.env.production` 注入到 `__WEAPP_CLOUD_ENV_ID__`，决定小程序运行时连哪个 CloudBase env。
2. **DevTools / CloudBase console env**：由 `project.config.json -> cloudenvironment` 和开发者工具环境下拉框决定，影响你正在查看和部署哪个云环境。

这两个不自动同步。每次碰 prod 前都要分别确认。

---

## 二、首次拉起项目

1. 安装依赖

```bash
npm install
```

2. 切到 DevTools dev 环境

```bash
npm run use:devtools:dev
```

3. 启动 dev watch

```bash
npm run dev:weapp:dev
```

4. 在微信开发者工具打开 repo 根目录

不要打开 `src/` 或 `dist/`，应打开项目根目录。

5. 看控制台启动日志

确认能看到：

```text
[cloud] runtime env = cloud1-9g8njw4c79fb1322
[cloud] runtime mode = development
```

如果 runtime env 不是 dev，先停下来排查，不要继续开发。

---

## 三、日常开发 SOP（dev）

### 每次开始开发前

```bash
git pull
npm run use:devtools:dev
npm run dev:weapp:dev
```

然后在微信开发者工具确认：

1. 当前打开的是 repo 根目录。
2. DevTools 当前环境下拉框是 dev。
3. 控制台 runtime env 是 `cloud1-9g8njw4c79fb1322`。
4. 当前页面不是历史缓存假象，必要时重新编译或删除 `dist`。

### 开发中原则

- 改 `src/`，不要改 `dist/`。
- 改 `cloudfunctions/appService/**` 后，需要在目标环境重新部署 `appService`。
- 任何只在 DevTools / CloudBase console 做的配置变更，都不是 git 追踪的一部分，需要手动记录。
- 新页面必须注册到 `src/app.config.ts`。
- active submit routes 以 `pkg/...` 为准。
- 不要把 `schools.city` 当作新地点写入目标，新增地点应写 `school_locations`。

### dev 最小回归检查

每次改动后至少检查：

1. 探索页是否正常加载。
2. 学习社区列表是否正常加载。
3. 活动列表是否正常加载。
4. 我的资料页是否能打开。
5. 本次改动相关页面是否正常。

---

## 四、提交前核验 SOP

### 代码层

1. 终端无编译报错。
2. 关键路径手动点通。
3. 如果改了路由 / 页面注册：
   - 检查 `src/app.config.ts`。
   - 检查实际跳转路径。
   - 检查页面物理文件是否存在。
4. 如果改了环境相关：
   - 检查 `.env.development`。
   - 检查 `.env.production`。
   - 检查 `project.config.json` 当前环境是否符合你此刻操作目标。
5. 如果改了云函数：
   - 确认只需要部署 `appService`。
   - 确认 action 已在 `cloudfunctions/appService/index.js` 的 `actionHandlers` 中可达。
   - 在 dev 先用云函数测试调用对应 action。

### DevTools 层

1. 当前环境确认无误。
2. 当前打开的页面不是历史缓存假象。
3. 必要时删除 `dist` 后重编。

---

## 五、dev 云函数核验 SOP

在 CloudBase console 或微信开发者工具云函数测试里，选择 dev 环境，测试 `appService`。

### 1. 基础 action 测试

```json
{
  "action": "getOpenId"
}
```

通过标准：返回 `ok: true`，且包含当前测试用户的 `openid`。

### 2. 公共内容测试

```json
{
  "action": "getSchools",
  "limit": 20
}
```

```json
{
  "action": "getEvents",
  "limit": 20
}
```

通过标准：返回 `ok: true`，并返回数组。数组可以为空，但如果数据库已有数据却返回空，要检查 runtime env、集合、权限、索引、status 字段和 `school_locations` 数据。

### 3. 学习社区地点迁移验证

```json
{
  "action": "validateSchoolLocationsMigration",
  "limit": 300,
  "startAfterId": 0
}
```

通过标准：

```text
missingCount = 0
readyForStrictLocations = true
```

---

## 六、prod build 核验 SOP

这是“确认 prod 前端产物会连到 prod”的流程，不等于已经完成上线。

1. 切 DevTools 环境到 prod

```bash
npm run use:devtools:prod
```

2. 重新 build prod

```bash
rm -rf dist
npm run build:weapp:prod
```

3. grep 核验 dist

```bash
grep -R "cloud1-9g8njw4c79fb1322\|keque-prod-d5gc6ylp793fabaea" dist | head
```

### 通过标准

- `dist/app.js` 应该出现 prod env id：`keque-prod-d5gc6ylp793fabaea`。
- 如果 `dist/app.js` 仍指向 dev，说明 prod build 没吃到 `.env.production`。

### 注意

`dist/project.config.json` 出现 dev 或 prod，只代表 DevTools 默认视角，不等于 runtime 连接目标。判断 runtime 以 `dist/app.js` / 启动日志为准。

---

## 七、prod 上线前核验 SOP

这一步不是只看 build，而是核 prod 环境本身是否完整。

### 1. runtime 核验

打开 prod build 后的小程序，确认控制台：

```text
[cloud] runtime env = keque-prod-d5gc6ylp793fabaea
[cloud] runtime mode = production
```

### 2. DevTools 当前环境核验

确认 DevTools / CloudBase 当前环境下拉框就是 prod。

### 3. prod 云函数核验

prod 环境至少应存在并部署最新版本：

```text
appService
```

`getOpenId`、`getSchools`、`getEvents`、`saveProfile`、`getMapUsers` 等都应作为 `appService` action 存在，不应再作为必须保留的独立云函数。

如发现旧独立云函数仍部署在 prod，可以在确认无兼容需求后清理。不要把“旧函数还在”误认为“当前架构需要它”。

### 4. prod action 核验

在 prod 的 `appService` 测试以下 action：

```json
{
  "action": "getOpenId"
}
```

```json
{
  "action": "getSchools",
  "limit": 20
}
```

```json
{
  "action": "getEvents",
  "limit": 20
}
```

```json
{
  "action": "validateSchoolLocationsMigration",
  "limit": 300,
  "startAfterId": 0
}
```

### 5. prod collection 核验

确认这些集合存在：

```text
users
connections
corrections
community_submissions
event_submissions
event_interest
event_interest_counts
admin_users
admin_audit_logs
safety_relations
user_reports
rate_limits
schools
school_locations
events
```

### 6. prod admin row 核验

检查 `admin_users` 中是否有你的 prod openid，且：

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

敏感和业务集合都建议：

```text
所有用户不可读写
仅云函数可读写
```

适用集合：

```text
users
connections
corrections
community_submissions
event_submissions
event_interest
event_interest_counts
admin_users
admin_audit_logs
safety_relations
user_reports
rate_limits
schools
school_locations
events
```

### 8. prod 索引核验

按 `docs/CLOUDBASE_INDEXES.md` 创建或核对索引。新增集合和高频路径优先：

```text
school_locations
schools
events
users
connections
community_submissions
event_submissions
rate_limits
admin_audit_logs
```

---

## 八、prod 最小 smoke test

在 prod 环境里至少点通这几条：

1. 探索地图能加载。
2. 全国视图能显示学习社区地点。
3. 全国视图能显示同路人 province summary。
4. 选中省份后，同路人城市 / 省份 cluster 正常。
5. 学习社区列表能加载。
6. 学习社区筛选能加载正确结果。
7. 学习社区详情页能打开，地点列表正常。
8. 活动列表能加载。
9. 活动详情页能打开。
10. “我的”页能读取资料。
11. 保存资料能成功。
12. 推荐新学习社区页面能打开并可提交。
13. 推荐新活动页面能打开并可提交。
14. 我感兴趣按钮能成功 toggle。
15. admin 入口只在正确账号出现。
16. 活动审核台能读取 `event_submissions`。

---

## 九、部署 `appService` SOP

当你改了 `cloudfunctions/appService/**`，并准备推到 prod：

1. 先执行

```bash
npm run use:devtools:prod
```

2. 确认 DevTools 当前环境下拉框是 prod。
3. 对 `appService` 执行“上传并部署：云端安装依赖”。
4. 部署后立即检查：
   - `appService` 更新时间是否正确。
   - prod 环境是否没有误切回 dev。
   - 用测试事件调用关键 action。

建议部署后先测：

```json
{
  "action": "getOpenId"
}
```

```json
{
  "action": "getSchools",
  "limit": 20
}
```

```json
{
  "action": "getEvents",
  "limit": 20
}
```

### 绝对不要

- 在没确认 DevTools 环境的情况下直接部署。
- 把“我 build 了 prod”误当成“我部署到了 prod”。
- 把 `getSchools` / `getEvents` 等 action 当成独立云函数去补部署。
- 为了修 prod 空数据，盲目补 MemFire env vars。当前公共内容链路应先查 CloudBase 集合、权限、索引、status 字段和 `appService` 部署状态。

---

## 十、常见故障排查

### 情况 1：页面能打开但数据空

优先查：

1. runtime env 是否正确。
2. DevTools 当前环境是否正确。
3. prod `appService` 是否为最新部署。
4. 对应 CloudBase 集合是否存在并有数据。
5. 集合权限是否允许云函数读写。
6. `schools` / `events` 文档是否有可读 status，或至少不是 `deleted` / `removed` / `archived`。
7. `school_locations` 是否已迁移并通过验证。

### 情况 2：函数明明部署了但页面像没生效

优先查：

1. 是不是部署到了 dev。
2. 现在小程序运行时是不是仍连着 dev。
3. 是否打开了旧缓存页面。
4. 是否需要重新 build 或删除 `dist`。

### 情况 3：控制台里看到的数据和页面对不上

优先怀疑：

```text
runtime env 和 DevTools / CloudBase console 当前环境没对齐
```

### 情况 4：学习社区列表有数据，但详情或地图没有地点

优先查：

1. `school_locations` 是否存在对应 `school_id`。
2. `school_locations.status` 是否不是 `deleted` / `removed` / `archived`。
3. 是否错误地把新地点写进了 `schools.city`，而没有写 `school_locations`。
4. 是否通过 `validateSchoolLocationsMigration`。

### 情况 5：全国地图没有同路人 marker

优先查：

1. `getMapUsers` 是否返回 `provinceStats`。
2. explore 前端是否把 `provinceStats` 渲染成 `user_cluster`。
3. 是否被 selectedProvince 条件误挡住。

---

## 十一、最短口令版

### 开发

```bash
npm run use:devtools:dev
npm run dev:weapp:dev
```

### prod build 核验

```bash
npm run use:devtools:prod
rm -rf dist
npm run build:weapp:prod
```

### prod appService 验证

```json
{
  "action": "getSchools",
  "limit": 20
}
```

```json
{
  "action": "validateSchoolLocationsMigration",
  "limit": 300,
  "startAfterId": 0
}
```

### 每次碰 prod 前问自己三遍

1. 我现在 runtime 连的是谁？
2. 我现在 DevTools / CloudBase console 看的是谁？
3. 我现在要部署 / 查看 / 修改的是谁？
