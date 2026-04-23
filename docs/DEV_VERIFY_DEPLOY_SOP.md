# 开发 / 核验 / 部署 SOP

这份 SOP 的目标不是“看起来差不多”，而是让你每一步都知道自己现在连的是哪一套环境、在验证哪一层东西。

---

## 一、首次拉起项目
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
- `[cloud] runtime env = cloud1-9g8njw4c79fb1322`
- `[cloud] runtime mode = development`

如果 runtime env 不是 dev，先停下来排查，不要继续开发。

---

## 二、日常开发 SOP（dev）
### 每次开始开发前
1. `git pull`
2. `npm run use:devtools:dev`
3. `npm run dev:weapp:dev`
4. 打开 DevTools，确认当前环境下拉框是 dev
5. 看控制台日志确认 runtime env 是 dev

### 开发中原则
- 改 `src/`，不要改 `dist/`
- 改云函数后，要在 DevTools 中对对应函数执行“上传并部署：云端安装依赖”
- 任何只在 DevTools console 做的配置变更，都不是 git 追踪的一部分，需要手动记录

### dev 最小回归检查
每次改动后至少检查：
1. 探索页是否正常加载
2. 学习社区列表是否正常加载
3. 活动列表是否正常加载
4. 我的资料页是否能打开
5. 本次改动相关页面是否正常

---

## 三、提交前核验 SOP
### 代码层
1. 终端无编译报错
2. 关键路径手动点通
3. 如果改了路由 / 页面注册：
   - 检查 `src/app.config.ts`
   - 检查实际跳转路径
   - 检查页面物理文件是否存在
4. 如果改了环境相关：
   - 检查 `.env.development`
   - 检查 `.env.production`
   - 检查 `project.config.json` 当前环境是否符合你此刻操作目标

### DevTools 层
1. 当前环境确认无误
2. 当前打开的页面不是历史缓存假象
3. 必要时删除 `dist` 后重编

---

## 四、prod build 核验 SOP
这是“我想确认 prod 产物前端会连到 prod”的流程，不等于已经完成上线。

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
- `dist/app.js` 应该出现 prod env id
- 如果 `dist/app.js` 仍指向 dev，说明 prod build 没吃到 `.env.production`

### 注意
`dist/project.config.json` 出现 dev 或 prod，只代表 DevTools 默认视角，不等于 runtime 连接目标。判断 runtime 以 `dist/app.js` / 启动日志为准。

---

## 五、prod 上线前核验 SOP
这一步不是只看 build，而是核 prod 环境本身是否完整。

### 1. runtime 核验
打开 prod build 后的小程序，确认控制台：
- `[cloud] runtime env = keque-prod-d5gc6ylp793fabaea`
- `[cloud] runtime mode = production`

### 2. DevTools 当前环境核验
确认 DevTools / CloudBase 当前环境下拉框就是 prod。

### 3. prod 云函数核验
至少检查以下函数存在于 prod：
- getSchools
- getSchoolDetail
- getEvents
- getEventDetail
- getMe
- saveProfile
- updatePrivacySettings
- getMapUsers
- sendRequest
- submitCommunity
- submitEvent
- checkAdminAccess
- getEventInterestInfo
- getEventInterestCountsBatch
- toggleEventInterest
- getEventContactInfo

### 4. prod 函数 env vars 核验
至少检查：
- getSchools
- getSchoolDetail
- getEvents
- getEventDetail

确认这些函数在 prod 都配置了：
- `MEMFIRE_API_BASE_URL`
- `MEMFIRE_API_KEY`

### 5. prod collection 核验
确认这些集合存在：
- users
- admin_users
- connections
- safety_relations
- user_reports
- community_submissions
- event_submissions
- event_interest
- event_interest_counts
- corrections

### 6. prod admin row 核验
检查 `admin_users` 中是否有你的 prod openid，且 `isActive = true`。

### 7. prod 权限核验
敏感集合不要处于“所有用户可读写”的宽松状态。

---

## 六、prod 最小 smoke test
在 prod 环境里至少点通这几条：
1. Explore 地图能加载
2. 学习社区列表能加载
3. 活动列表能加载
4. 活动详情页能打开
5. “我的”页能读取资料
6. 保存资料能成功
7. 推荐新学习社区页面能打开
8. 推荐新活动页面能打开
9. 我感兴趣按钮能成功
10. admin 入口只在正确账号出现

---

## 七、部署云函数 SOP
当你改了云函数，并准备推到 prod：
1. 先执行
```bash
npm run use:devtools:prod
```
2. 确认 DevTools 当前环境下拉框是 prod
3. 对修改过的函数逐个执行“上传并部署：云端安装依赖”
4. 部署后立即检查：
   - 函数更新时间
   - 函数 env vars 仍在
   - prod 环境是否没有误切回 dev

### 绝对不要
- 在没确认 DevTools 环境的情况下直接部署
- 把“我 build 了 prod”误当成“我部署到了 prod”

---

## 八、常见故障排查
### 情况 1：页面能打开但数据空
优先查：
1. runtime env 是否正确
2. DevTools 当前环境是否正确
3. prod 对应函数是否存在
4. prod 函数 env vars 是否存在

### 情况 2：函数明明部署了但页面像没生效
优先查：
1. 是不是部署到了 dev
2. 现在小程序运行时是不是仍连着 dev
3. 是否打开了旧缓存页面

### 情况 3：控制台里看到的数据和页面对不上
优先怀疑：
- runtime env 和 DevTools 当前环境没对齐

---

## 九、最短口令版
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

### 每次碰 prod 前问自己三遍
1. 我现在 runtime 连的是谁？
2. 我现在 DevTools 看的是谁？
3. 我现在要部署/查看/修改的是谁？
