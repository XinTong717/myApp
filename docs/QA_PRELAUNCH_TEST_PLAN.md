# 可雀小程序 上线前完整测试方案（QA Test Plan · v2）

Updated: 2026-06-24
Target prod env: `keque-prod-v2-d8gfsxh8j16fba620`
版本基线：`main` @ `039b023`（fix: pin selected province filter near front）
法务版本：用户协议 / 隐私政策均为 `2026-05-10`
运营主体：杭州可雀科技有限责任公司 · 504302201@qq.com
Prod admin openid：`ov00D7gJm8DOIWwrhcUa6mBdFgx8`（`admin_users` 中 `isActive=true, role=admin`）

> 本文是**功能与体验层**的完整测试方案。与现有文档分工：
> - 环境/部署/集合/权限/索引 → `PROD_LAUNCH_CHECKLIST.md`、`CLOUDBASE_RECENT_INDEX_CHECK.md`、`DEV_VERIFY_DEPLOY_SOP.md`
> - 产品边界（非私信社交） → `PRODUCT_BOUNDARY.md`
> - 本文 → 用户/admin 全流程用例、**本轮已修项回归**、机型矩阵、自动化策略、CloudBase 数据核对、排障、签收表

勾选记号：`[ ]` 未测 / `[x]` 通过 / `[!]` 有问题。

---

## 静态门禁现状（2026-06-24 本地实跑，全绿）

| 检查 | 结果 |
|---|---|
| `npm run typecheck` | ✅ 通过 |
| `npm run check:actions` | ✅ **35 / 35 / 35**，fail-closed 8 个 |
| `npm run check:legal-version` | ✅ terms/privacy 均 `2026-05-10` |
| `npm run check:design-system` | ✅ 通过 |

> 说明：`getSchoolPublishPayload`（admin 学习社区发布载荷）已纳入三方一致清单，所以仍是 35/35。这一层只保证“action 接得上、法务同步、类型不崩、包不超标”，**不保证业务正确**，故仍需下面的回归与真机测试。

---

## 0. 本轮回归重点（最近修复项，必须逐条复验）⭐

这是 v2 相对 v1 最重要的新增段。下列问题在历史上**真出现过并已修**，回归风险最高，先集中验证；前端改动不需要重新部署 `appService`，但**后端 handler 改动（saveProfile、manageSafetyRelation、reportUser）必须确认 prod 的 `appService` 已部署最新版**。

| # | 已修内容（commit） | 复验步骤 | 通过标准 |
|---|---|---|---|
| R1 | **首次保存资料不创建 users 文档**（`3b399e8`，`saveProfile` 现在在 `update` 影响 0 行时 `set` 创建） | 用**全新 openid** 账号填资料→保存→重进“我的” | `users` 集合出现该文档；“我的”能回显；探索页“完善信息”横幅消失；`getMe` 返回非空 profile |
| R2 | **拉黑报 UNKNOWN_ACTION / INVALID_ACTION**（`e011cf8`，参数由 `action` 改名 `relationAction`，避免与路由 `action` 字段撞名） | 地图弹窗→拉黑 B | 提示“已拉黑”；`safety_relations` 新增 block 记录；**不再**报 UNKNOWN/INVALID_ACTION |
| R3 | **举报集合不一致**（已统一 `user_reports`，active handler 在 `userProfile.js`） | 举报 B（含“其他+自定义说明”） | `user_reports` 新增记录（**不是** `reports`）；含 reason/note/targetOpenid |
| R4 | **举报“其他”需填说明 + 中文化**（`cfbdfda`/`bd68d3a`，去掉英文 Cancel） | 选“其他”不填说明直接提交 | 拦截“请填写举报说明”；按钮全中文；选其它原因则直接提交 |
| R5 | **地图 lat undefined 报错**（双击 marker / 点举报/拉黑/关闭触发地图 SDK 报错） | 双击 marker；开弹窗后点举报、拉黑、关闭 | 控制台**无** `Cannot read property 'lat' of undefined`；无地图 SDK 报错 |
| R6 | **弹窗遮挡/不可滚动**（`7681eed`，弹窗 `ScrollView` 可滚动，maxHeight 88vh，顶部姓名+✕不被遮） | 打开内容很长的用户弹窗 | 可上下滚动；顶部标题与关闭按钮完整可点 |
| R7 | **自己弹窗显示“去看我的资料”**（已移除；自己不显示举报/拉黑） | 点自己的坐标 | 显示“这是你自己”标签；**无**举报/拉黑/“去看我的资料”按钮 |
| R8 | **空资料弹窗啰嗦**（`4b7bd0c`，无简介只显示一句） | 看一个没填简介的他人 | 只显示“这位同路人还没有填写更多公开介绍。”，不叠加重复提示 |
| R9 | **新人引导对老用户重复弹**（`394c8c7`，仅未完善资料才弹） | 已完善资料账号清缓存重进探索 | **不**弹“欢迎来到可雀”；全新/未完善账号才弹一次 |
| R10 | **省份栏选中后塌缩**（`c9acfb9`+`039b023`，保留全部省份且选中省固定在“全国”后） | 点“江苏” | 省份栏为 `全国｜江苏｜其他省…`；可直接切别的省；再点江苏取消回全国；横滑不卡 |
| R11 | **原生地图盖住弹层 / 交互态崩**（`7eacb9f`，弹层打开时地图被替换为空白占位 `isInteractionPaused`） | 打开任意弹窗→关闭 | 弹窗期间地图区域为空白（弹层完整显示在上层）；**关闭后地图重新挂载并正确渲染**，无残留、无白屏、无明显闪烁 |
| R12 | **DevTools 地图缩放报错**（`7c839e4`，仅 devtools `enableZoom=false`） | devtools 里缩放地图 vs 真机捏合 | devtools 不缩放（预期，非 bug）；**真机**捏合缩放正常 |

> R11 引入了新的待测点：**地图每次开/关弹层都会重挂载原生地图**。在低端安卓上重点观察重挂载是否卡顿/闪“地图加载中…”，以及连续开关多次是否内存/性能异常。

低优先清理项（非阻断）：`cloudfunctions/appService/handlers/userV2.js:300` 仍残留一个**未被路由的死 `reportUser`**，仍写 `collection('reports')`。当前生效的是 `userProfile.js` 版本（写 `user_reports`），死代码不影响功能，但建议删除以防将来误接回。

---

## 1. 能不能不全靠手测？自动化 vs 手测策略

结论不变：**不能 100% 自动化，但可把一大半重复劳动转自动/半自动。** 四层，从零成本到可选投入：

### 层 1 — 编译期硬门禁（已具备，每次出包前必跑）
```bash
git pull --ff-only origin main
npm install
npm run build:weapp:prod:check
```
依次跑：`tsc --noEmit` → `check:actions`（前端 `ROUTED_ACTIONS`/后端 `actionHandlers`/`ACTION_RATE_LIMITS` 三方一致）→ `check:legal-version`（前后端法务版本一致）→ prod build → `check:weapp:size`（总 dist ≤20MB，分包桶 ≤2MB）。
> ⚠️ `build:weapp:prod` 会执行 `use:devtools:prod-upload`，**改写 `project.config.json` 的 cloudenvironment 为 prod**。跑完要确认 DevTools 当前环境符合你下一步意图。

### 层 2 — 云函数 action 烟囱脚本（建议新增，ROI 最高）⭐
把第 13 节 / 附录的测试 JSON 固化为可重复执行：
- A：DevTools → 云函数 `appService` 测试面板，存测试模板，dev 一套、prod 部署后一套。
- B：Node 脚本（`@cloudbase/node-sdk`）循环调用并断言 `ok===true`。约半天搭好，之后每次部署 1 分钟跑完。

### 层 3 — 纯逻辑单元测试（建议新增；当前**零测试框架**）
最高性价比补测对象（无需设备/云）：`lib/normalize.js`、`lib/eventPublishPayload.js`（发布拦截）、`lib/security.js`（msgSecCheck 分支）、`lib/legalConsent.js`、`explore/utils/markerBuilders` + `useExploreFilters`（同维 OR/跨维 AND、聚合点位）。加 `vitest`，几十个用例锁住数据类回归。

### 层 4 — UI 端到端（可选）
`miniprogram-automator` 驱动开发者工具模拟器跑 10 条 happy path。**模拟器≠真机**，不能替代地图渲染/滑块/隐私弹窗/性能/审核。

### 必须真机/手动（无法自动化）
原生地图渲染与**重挂载**（R11）、年龄滑块手势、隐私授权合约、多账号隐私矩阵、弱网/低端机性能、微信审核表现、`msgSecCheck` 在 prod 的真实判定。

### 高效工作流一句话
> 改完 → 层1 → （后端改了才）部署 appService → 层2 烟囱 → devtools 过 happy path → **真机过第 0/4/7/8 节** → 体验版众测 → 灰度盯 `client_error_logs` + 云函数日志。

---

## 2. 环境与账号

### 2.1 环境三对齐（本项目最大坑）
启动看 Console（`src/app.ts`）：`[cloud] runtime env` / `runtime mode`。prod 应为 `keque-prod-v2-d8gfsxh8j16fba620` / production。出现 `using the fallback cloud env` 即停查。交叉确认：runtime env、DevTools 当前环境、要部署/查看的目标，三者一致。

### 2.2 账号矩阵
| 账号 | 角色 | 用途 |
|---|---|---|
| A | 已完善·上图 | 主流程、被查看 |
| B | 已完善 | 查看/拉黑/举报 A、隐私对照 |
| C | **未完善** | 验证“未完善看不到扩展字段”、新人引导 |
| D | prod admin（`ov00D7gJm8...`） | 审核发布全流程 |
| E | 已申请注销 | 匿名化/隐藏验证 |

至少 2 台真机（建议 1 iOS + 1 Android）+ 开发者工具。
> 真机扫体验码：被测微信若提示“暂无体验权限”，需在小程序后台「成员管理」加为**体验成员**。预览/体验码非公开访问码，仅管理员/开发者/体验者可开。

---

## 3. 机型 / 设备矩阵

| 维度 | 覆盖 | 重点 |
|---|---|---|
| iOS | 新机 + 若可得旧机 | 地图**重挂载**(R11)、滑块、安全区 |
| Android | 主流 + 低端/老旧 | 地图重挂载性能、滑块手势、键盘顶起、字体放大 |
| 微信版本 | 最新 + 较旧 | 隐私授权 API、`onLabelTap` 支持度、同层渲染 |
| 深色模式 | 开/关 | 配色可读性（未声明 darkmode，确认不被系统反色破坏） |
| 字体放大 | 标准 + 最大 | 卡片/按钮换行不破版 |
| 屏幕 | 刘海/灵动岛/无刘海 | 顶部筛选条、tabBar、地图 `calc(100vh-120px)` |
| 网络 | Wi-Fi/4G/弱网/断网 | 加载态、缓存、超时文案、分包预载 |
| 时区 | 改成非中国时区 | 活动时间（保存 UTC+8） |

> 单人难覆盖全机型 → 用 DevTools「真机调试 2.0」+ 体验版分发给 3~5 个不同机型同事众测。

---

## 4. 探索（地图）

页面 `src/pages/explore/index.tsx`、`components/MapMarkers.tsx`、`UserPopup.tsx`、`ClusterPopup.tsx`

### 4.1 渲染与 R11 重挂载
| # | 步骤 | 期望 | 风险 |
|---|---|---|---|
| A1 | 冷启动进探索 | 先“正在加载/整理点位”，数据齐才渲染地图 | 弱网真机确认不卡中间态 |
| A2 | 全国视图 | 学习社区点位 + 同路人省份聚合 | 🔶**prod 必须有 seed 学习社区数据**，否则恒“暂无点位” |
| A3 | 开/关任意弹层 | 开：地图区变空白占位，弹层完整在上层（R11）；关：地图重挂载、正确渲染 | 🔶真机 iOS+Android 各验；低端机看重挂载是否卡顿/闪烁 |
| A4 | 连续多次开关弹层 | 无内存增长异常、无白屏、marker 仍可点 | |
| A5 | 点学校聚合 → 进省份视图；点省份同路人聚合 → 切省；省内点同城聚合 → ClusterPopup | 行为正确 | |
| A6 | 真机捏合缩放 / devtools 缩放 | 真机可缩放；devtools 不缩放（R12，预期） | |
| A7 | 标签密度（全国 vs 省内） | 全国自动隐藏多数名称 | 大数据量不重叠/不卡 |

### 4.2 筛选与省份栏（R10）
| # | 步骤 | 期望 |
|---|---|---|
| A8 | “学习社区/同路人”图层开关 | 显隐+计数更新；关闭后弹层关闭 |
| A9 | 顶部两行控件横滑 | 一行内可滑、不换行、不裁切 |
| A10 | 同路人筛选：角色/孩子年龄/城市/完整度 | 同维 OR、跨维 AND；重置可用；改完不卡输入（`93e5195` 修复点） |
| A11 | 省份切换（R10） | 选中省固定在“全国”后；保留全部省；再点取消回全国 |

### 4.3 弹窗 / 举报 / 拉黑（R2~R8）
| # | 步骤 | 期望 |
|---|---|---|
| A12 | 他人弹窗 | 有简介展示简介/关系；无简介只一句话(R8)；扩展字段仅 `hasExpandedProfile` 时显示 |
| A13 | 自己弹窗(R7) | “这是你自己”；无举报/拉黑/“去看我的资料” |
| A14 | 未完善资料者看他人 | 提示“完成个人资料后可查看完整资料”+“去填写资料”按钮 |
| A15 | 举报(R3/R4)：四种原因 | 非“其他”直接提交；“其他”必填说明(≤300，超限/敏感词后端拦)；成功写 `user_reports` |
| A16 | 拉黑(R2) | 二次确认→“已拉黑”→对方消失→`safety_relations` 新增 block；清缓存+force refresh |
| A17 | 恢复测试 | CloudBase 删 `safety_relations` 记录或改回非 block，对方重新可见 |

### 4.4 新人引导 & 横幅（R9）
| # | 步骤 | 期望 |
|---|---|---|
| A18 | 全新/未完善账号首次进（有点位） | 弹一次“欢迎来到可雀” |
| A19 | 已完善账号清缓存重进 | **不**再弹 |
| A20 | 未完善资料 | 顶部“完善个人信息后可查看其他成员资料”横幅 → 跳我的；完善后消失(R1 关联) |

---

## 5. 学习社区（列表 / 详情 / 推荐 / admin）

页面 `pages/schools`、`pages/school-detail`、`pkg/schools/submit`；admin `pages/admin/school-submissions`

| # | 步骤 | 期望 | 备注 |
|---|---|---|---|
| B1 | 列表加载/空态 | `getSchools` | |
| B2 | 搜索（名称/城市/类型/地点） | 命中 haystack | |
| B3 | 多选筛选：地区/类型/阶段 | 同维 OR、跨维 AND；选项来自 `getFilterOptions` | 🔶`school_locations` 无数据则筛选项/地点缺失 |
| B4 | 列表→详情 | 预览缓存先渲染(5min TTL)再被完整替换，不闪 | |
| B5 | 详情多地点 | `locations` 正确；类型标签隐藏迁移备注 | 回归点 |
| B6 | 详情分享 | 转发卡标题/路径正确，好友可进同页 | |
| B7 | 推荐新学习社区 | 必填校验、在线开关、数字年龄段滑块、类型对齐目录 | submit 改动多，整页重测 |
| B8 | 连点提交 | `submitLockRef` 去抖 | |
| B9 | 提交成功 | “已进入审核”modal | |
| B10 | 重复提交 | 后端 dedupe（`normalizedKey` 含 online flag） | |
| B11 | 离开未提交页 | 不弹英文 leave alert | 回归点 |
| **B12** | **admin：学习社区发布载荷（新）** | `getSchoolPublishPayload` 返回结构化载荷供人工录入 `schools`+`school_locations` | **本轮新增 action，重点测** |
| B13 | admin 列表/复制/标记 processed·duplicate·rejected·重置 | `reviewSchoolSubmission` 改状态 + 写 `admin_audit_logs` | |

---

## 6. 活动（列表 / 详情 / 兴趣 / 推荐 / admin）

页面 `pages/events`、`event-detail`、`pkg/events/submit`；admin `pages/admin/event-reviews`

| # | 步骤 | 期望 |
|---|---|---|
| C1 | 列表加载（默认 100，后端 max 200）；默认隐藏已结束；线上/线下筛选 | 正确 |
| C2 | 下拉刷新 | 列表刷新 |
| C3 | 列表→详情 | 预览缓存先渲染；详情 cache 2min（admin 编辑快速生效） |
| C4 | 我感兴趣 toggle | 即时反馈+计数变化；60/分限流；未完善/未同意被 consent gate 拦 |
| C5 | 详情联系方式 | `getEventContactInfo` **仅对已填资料用户可见** |
| C6 | 分享 | 转发卡正确 |
| C7 | 提交活动整表单校验 | 标题/城市(非线上)/开始时间/费用/组织者/简介必填；结束、报名截止“日期+时间”同填同空；周期“其他”要补充 |
| C8 | **年龄滑块（真机手势）**🔶 | 双手柄拖动顺滑、min≤max、显示正确 | 真机必测，低端安卓尤其 |
| C9 | 线上开关 | 省市清空，按线上处理，存“线上”；不错误落地图点位 |
| C10 | **改设备时区为非 UTC+8** | 提交按 UTC+8 保存；展示无偏移错乱 | 🔶时区经典 bug 源 |
| C11 | 连点提交 | `submitLockRef`+`submittedRef` 去抖 |
| C12 | admin 审核台 | `listEventSubmissions` 加载 |
| C13 | admin 发布 payload | 见 warnings/blockingErrors/`contentSecurityStatus`；check_failed 标为需人工复核 |
| C14 | admin 一键发布 | `publishEventDirect`：写 `events`、提交转 `merged`、回写 `publishedEventId`、写 `admin_audit_logs`、前端清活动缓存；`counters/events.current` 自增 |
| C15 | **重复/已发布再发** | 幂等：已 merged 返回“无需重复”；`source_submission_id` 已存在则同步不重复建 |
| C16 | blockingErrors 非空 | `PUBLISH_BLOCKED` + 可执行原因，不写库 |
| C17 | 发布后看活动 tab | 新活动出现 |

---

## 7. 我的（**新三栏结构**：个人资料 / 隐私设置 / 我的活动）

页面 `src/pages/profile/index.tsx`（`c215788` 重组）。**注意结构已变**：原“基本资料/身份补充/隐私设置”三步 → 现“个人资料 / 隐私设置 / 我的活动”。**同意协议 + 保存资料按钮已移到第一栏“个人资料”底部**（不再是最后一步）；身份补充字段（家长/教育者/同行者）现在**和基本资料同在“个人资料”栏**联动显示。

### 7.1 个人资料栏
| # | 步骤 | 期望 |
|---|---|---|
| D1 | 基本资料校验 | 显示名、至少一身份、省市必填；“其他城市”要填真实城市名 |
| D2 | 身份联动 | 选家长才显示孩子相关；教育者显示服务；同行者显示“和生态的关系”；都没选有提示 |
| D3 | 角色取消后保存 | 后端清空对应字段 |
| D4 | 字段长度上限 | 显示名30/简介200/关系150/家庭关注300/服务500/备注120，超长后端 `INVALID_LENGTH` |
| D5 | 联系方式校验 | 含 t.me/wa.me/telegram 链接被拒；超120字被拒 |
| D6 | 同意协议 | 未勾不能保存；保存先 `recordLegalConsent` 再 `saveProfile` |
| D7 | 保存（含 R1 首存） | 全新账号保存→`users` 建文档→回显→“保存成功”modal→去探索 |
| D8 | 再次保存 | 走 update（mode=update） |
| D9 | 草稿缓存 | openid 维度草稿，重进不丢未保存内容 |

### 7.2 隐私设置栏（即时保存，无保存按钮）
| # | 步骤 | 期望 | 风险 |
|---|---|---|---|
| D10 | 完成资料未显式关开关 | `isVisibleOnMap`/`expandedProfileVisible` **默认 true** | 🔶确认“默认 opt-in 公开”有意为之且披露充分（`PrivacyDisclosureNotice` 有披露） |
| D11 | 关“地图可见” | toast“设置已更新”；自己从目录消失（他人刷新后看不到） |
| D12 | 关“扩展资料可见” | toast“设置已更新”；别人看不到联系方式/扩展字段 |
| D13 | 开关后无需点保存 | `updatePrivacySettings` 即时生效 |
| D14 | 已拉黑/静音列表 + 解除 | `getSafetyOverview`；解除后对方重新可见 |
| D15 | 账号注销 → 两次确认 | 写 `account_deletion_requests`(pending)；本人资料即匿名化“已注销用户”、清联系方式、`isVisibleOnMap=false`、从地图隐藏；注销说明含敏感词走 msgSecCheck(scene2) |

### 7.3 我的活动栏
| # | 步骤 | 期望 |
|---|---|---|
| D16 | “我发布的活动” | 当前为**占位卡**（文案：之后显示提交/审核中/已发布），非 bug |
| D17 | “我感兴趣的活动” | `getMyFavoriteEvents`：未同意协议/未完善返回 legal gate 是预期；完善后正常列出 |

> 后续若要做真正的“我发布的活动”，需新增 `getMyPublishedEvents` action + `events.source_submission_id`/`created_by_openid` 查询，属上线后迭代，非本次必做。

### 7.4 法务页
| # | 步骤 | 期望 |
|---|---|---|
| D18 | 打开《用户协议》《隐私政策》(分包 `pkg/legal`) | 正常打开 |
| D19 | 协议内容核对 | 明确“无私信/无好友申请/无站内撮合”；主体“杭州可雀科技有限责任公司”、邮箱 `504302201@qq.com`；版本 `2026-05-10` |
| D20 | consent 复弹逻辑 | 版本不变不复弹；后端已有 consent 时清缓存重进不强制重新同意；版本变更才重弹 |

---

## 8. 隐私可见性矩阵（多账号，安全合规核心）🔴

真源 `handlers/mapUsers.js` 的 `toPublicUser`/`isVisibleToRequester`。逐格验证：

| 场景 | A 设置 | B（请求者） | B 应看到 |
|---|---|---|---|
| 基础公开 | 上图 | 已完善 | 显示名/身份/省市/简介/“和生态的关系” |
| 扩展字段 | 上图+扩展可见 | 已完善 | 额外：联系方式/备注/家庭/教育者扩展 |
| 未完善看不到扩展 | 上图+扩展可见 | **未完善(C)** | 仅基础，看不到联系方式/扩展 |
| A 关扩展 | 上图+扩展关 | 已完善 | 看不到 A 联系方式/扩展 |
| A 关上图 | 不上图 | 任意 | A 不在目录/聚合统计 |
| A 拉黑 B | 上图 | B 已完善 | 双向不可见（`hiddenOpenids`/`blockedByOpenids`） |
| 家长字段隔离 | 家长，扩展可见 | 已完善 | childAgeRange 等仅 A 含“家长”才返回 |
| 注销用户(E) | — | 任意 | 不在地图；显示名匿名 |
| 省份聚合两路径 | — | 有/无筛选&拉黑 | 聚合(`getAggregateProvinceSummaries`)与扫描回退(`getScannedProvinceSummaries`)计数都正确排除不可见者 |

---

## 9. Admin 审核 / 发布

| # | 步骤 | 期望 |
|---|---|---|
| E1 | 非 admin | “我的”无 admin 入口；直访 admin 页 `checkAdminAccess` 非 admin |
| E2 | prod admin(D) | 入口出现；审核台加载 |
| E3 | admin 置 `isActive=false` | 入口消失/操作被拒 |
| E4 | 活动：list→payload→一键发布→幂等（见 C12~C17） | 通过 |
| E5 | 活动“仅回写已发布”/“重置待审核” | 前者只同步状态；后者改回 pending 但不删已建活动 |
| E6 | 学习社区：list→`getSchoolPublishPayload`(新)→复制→标记状态 | 状态更新 + 写 `admin_audit_logs` |

---

## 10. 跨切面与边界

### 10.1 内容安全 msgSecCheck（`lib/security.js`）🔶
| # | 场景 | 期望 |
|---|---|---|
| X1 | 正常文本 | 通过/进 review |
| X2 | 已知违规串 | 硬拦截（87014/suggest=review|blocked） |
| X3 | API 不可用·保存资料(scene1, softPass) | 软通过，资料仍存，`profileContentSecurityStatus=check_failed` 待人工 |
| X4 | API 不可用·提交活动/社区/举报说明(scene2) | 软通过进 review，不卡死用户 |
| ⚠️ | — | 🔶**prod 必须实授 `security.msgSecCheck` OpenAPI 权限并重部署 appService**，否则全走 check_failed 软通过=内容安全形同虚设。devtools 常无真实判定 → X1/X2 **prod 真机验**。 |

### 10.2 限流 fail-closed（`rateLimits.config.js`）
| # | 场景 | 期望 |
|---|---|---|
| X5 | 高频（submit 5/天、report 10/天、interest 60/分…） | 超限 RATE_LIMITED 友好文案 |
| X6 | `rate_limits` 异常降级 | fail-closed 名单(8个：submit*/report/interest/contact/publish/review)返回 `RATE_LIMIT_UNAVAILABLE` 而非放行 |
| ⚠️ | — | 🔶`rate_limits` 权限/索引坏 → 上述写动作**全部拒绝**。上线前确认健康。 |

### 10.3 consent gate / 网络 / 异常
| # | 场景 | 期望 |
|---|---|---|
| X7 | 未同意触发写 | `LEGAL_CONSENT_REQUIRED`→toast+跳我的（1.5s 去抖） |
| X8 | `legal_consents` 不可读 | 🔶所有 consent-required 写动作被锁，上线前确认可读写 |
| X9 | 断网各 tab | 友好错误态+重新加载 |
| X10 | 未注册 action | 前端 `ROUTED_ACTIONS` 拦截 |
| X11 | 云返回缺 ok | 兜底失败不崩 |
| X12 | 全局错误 | `wx.onError/onUnhandledRejection` 10% 采样上报 `client_error_logs`（仅短元数据） |

---

## 11. 微信审核专项

| # | 检查 |
|---|---|
| W1 | **隐私保护指引**在 mp 后台配置（本项目唯一权限面，`onNeedPrivacyAuthorization`/`openPrivacyContract` 依赖它，提审前必配） |
| W2 | 类目与内容匹配（教育探索/成员目录，非开放社交） |
| W3 | 全局无“申请联系/好友申请/请求连接/智能撮合/私信/匹配同路人”等词（`PRODUCT_BOUNDARY.md` 第10节） |
| W4 | 用户协议/隐私政策可达且内容一致（主体/邮箱/版本 2026-05-10） |
| W5 | UGC 内容安全闭环可演示（提交→人工审核→发布；msgSecCheck 已接） |
| W6 | 举报/拉黑/注销入口可达且**真落库**（R2/R3 复验过） |
| W7 | 未成年人保护：不鼓励自注册；提交页提示勿填未成年人敏感信息 |
| W8 | 提供审核员可用账号 + admin 说明 |
| W9 | 所有分包页已在 `app.config.ts` 注册、跳转路径真实 |

---

## 12. 排障手册（按症状）

| 症状 | 先查 |
|---|---|
| 页面能开但**数据空** | runtime env→DevTools 环境→prod appService 是否最新→集合有无数据→权限“仅云函数读写”→status 字段→索引 |
| **地图无点位** | seed 数据→`getSchoolMarkers`/`getMapUsers` 返回→selectedProvince 误挡 |
| **关弹窗后地图白屏/不回来** | R11 重挂载；看 `isInteractionPaused` 是否复位、map key 是否变化 |
| **提交一直失败** | consent gate(X8)/限流 fail-closed(X6)/msgSecCheck 权限(X1) |
| **举报没效果** | 看云函数日志 reportUser，确认落 `user_reports`（非 `reports`） |
| **拉黑报错** | 确认前端发 `relationAction`、appService 已部署 R2 版本 |
| **首存后资料空** | 确认 appService 已部署 R1 版本（update 0 行时 set 建文档） |
| **发布报错/重复** | publishEventDirect 幂等分支；`counters/events` 可写；blockingErrors |
| **函数部署了页面没变** | 部署到 dev？runtime 还连 dev？旧缓存页？重 build 删 dist？ |
| **控制台数据与页面对不上** | runtime env 与 console 当前环境没对齐（最常见） |

排障工具优先级：① 启动日志(runtime env/mode) ② CloudBase 云函数日志(按 action 看 errCode) ③ `client_error_logs`(灰度期 10% 采样) ④ 直接查库 ⑤ 真机调试 2.0。

可忽略的 DevTools warning（非 P0，除非真机异常）：
```
SharedArrayBuffer deprecation
getSystemInfo API Notice
scroll-view padding property not yet supported in webview rendering mode
worker reportRealtimeAction: fail not support
```

---

## 13. CloudBase 数据写入核对

每做一次写操作，去对应集合确认落库（prod 当前已存在以下集合）：

| 操作 | 集合 | 关键字段 |
|---|---|---|
| 保存资料 | `users` | 文档 `_id`=openid、`isVisibleOnMap`、`profileContentSecurityStatus` |
| 同意协议 | `legal_consents` | 版本 `2026-05-10` |
| 举报 | `user_reports` | reporterOpenid/targetOpenid/reason/note/status=pending |
| 拉黑/静音 | `safety_relations` | `safety_<owner>_<target>`、isBlocked/isMuted |
| 推荐社区 | `school_submissions` | status=pending、normalizedKey |
| 提交活动 | `event_submissions` | status=pending、contentSecurityStatus |
| 发布活动 | `events` + `counters/events` | events 新行、submission→merged、counter 自增 |
| 我感兴趣 | `event_interest` / `event_interest_counts` | 状态 + 计数 |
| 注销 | `account_deletion_requests` | status=pending；`users` 被匿名化 |
| admin 操作 | `admin_audit_logs` | action/targetId/metadata |
| 前端崩溃 | `client_error_logs` | 10% 采样短元数据 |

prod 完整集合清单：`account_deletion_requests, admin_audit_logs, admin_users, client_error_logs, counters, event_corrections, event_interest, event_interest_counts, event_submissions, events, legal_consents, rate_limits, safety_relations, school_corrections, school_locations, school_submissions, schools, user_reports, users`。
权限统一应为：**所有用户不可读写，仅云函数可读写**（已确认 `users` 如此）。

---

## 14. 上线前推荐顺序 + 签收表

### 顺序
1. `git pull --ff-only origin main` → `npm run typecheck` → `npm run build:weapp:prod:check`（注意 prod build 会改 DevTools 环境）
2. （若动过后端）部署 `appService` 到 prod（云端安装依赖），确认更新时间、R1/R2/R3 版本已上
3. 层 2 烟囱（dev + prod，附录 JSON）
4. DevTools 冒烟：探索/我的/学习社区/活动/admin/举报/拉黑/省份切换
5. **真机**：第 0 节回归 R1~R12 + 第 4/7/8 节设备相关用例（iOS+Android）
6. 体验版分发多机型众测
7. CloudBase 数据核对（第 13 节）
8. 微信提审专项（第 11 节）

### 签收
```text
版本 commit：039b023   微信上传版本号：______   日期：______   测试人：______

[ ] 静态门禁全绿（typecheck/actions 35-35-35/legal 2026-05-10/design/size）
[ ] appService 已部署 prod 最新（含 R1 首存 / R2 relationAction / R3 user_reports）
[ ] 第0节 R1~R12 回归全过（真机 iOS+Android）
[ ] R11 地图重挂载在低端机无卡顿/白屏
[ ] 第8节 隐私可见性矩阵全过（多账号）
[ ] 举报落 user_reports / 拉黑落 safety_relations（CloudBase 实测）
[ ] admin 活动一键发布幂等 + getSchoolPublishPayload 可用 + 审计日志
[ ] msgSecCheck 在 prod 真实判定通过（X1/X2）
[ ] 限流 / consent gate / 弱网兜底通过
[ ] PROD_LAUNCH_CHECKLIST（集合/权限/索引/seed）全过
[ ] 隐私保护指引已在 mp 后台配置（W1）
[ ] 微信提审专项通过
[ ] 体验版多机型众测通过

阻断问题：________________________
（可选清理）userV2.js:300 死代码 reportUser→reports 删除：[ ]
```

---

## 附录：appService action 测试 JSON（已人工验证可通的标 ✓）

```jsonc
{ "action": "getOpenId" }                                  // ✓ openid 正常
{ "action": "getSchoolMarkers", "limit": 200 }             // ✓
{ "action": "getSchools", "limit": 50 }                    // ✓
{ "action": "getEvents", "includeInterestCounts": true }   // ✓
{ "action": "getFilterOptions" }                           // ✓
{ "action": "getMapUsers" }                                // ✓ province summary
{ "action": "getMapUsers", "province": "浙江", "offset": 0, "limit": 100 } // ✓ detail
{ "action": "getProfileBootstrap" }                        // ✓
{ "action": "getLegalConsentStatus" }                      // ✓
{ "action": "getMyFavoriteEvents" }                        // ✓（未同意时 legal gate 为预期）
{ "action": "checkAdminAccess" }                           // ✓ isAdmin:true（admin 账号）
{ "action": "validateSchoolLocationsMigration", "limit": 300, "startAfterId": 0 } // 期望 missingCount=0
// admin（用真实 _id）
{ "action": "listEventSubmissions", "status": "pending", "limit": 5 }
{ "action": "publishEventDirect", "submissionId": "REAL_ID" }
{ "action": "listSchoolSubmissions", "status": "pending", "limit": 5 }
{ "action": "getSchoolPublishPayload", "submissionId": "REAL_ID" }   // 本轮新增
{ "action": "reviewSchoolSubmission", "submissionId": "REAL_ID", "reviewAction": "mark_processed" }
```
