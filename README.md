# 可雀 / myApp

微信小程序项目（Taro + React）。当前重点是：
- 探索地图
- 学习社区列表与详情
- 活动列表与详情
- 成人资料页 / 联络 / 安全控制
- 用户提交学习社区 / 活动并进入审核流

## 环境模型
项目有两条容易混淆的线：

1. **前端运行时环境**
   - 由 `.env.development` / `.env.production` 中的 `TARO_APP_CLOUD_ENV` 决定
   - 编译后注入 `__WEAPP_CLOUD_ENV_ID__`
   - `src/app.ts` 里的 `Taro.cloud.init()` 使用它

2. **微信开发者工具 / CloudBase 控制台环境**
   - 由 `project.config.json` 中的 `cloudenvironment` 决定
   - 影响你在 DevTools 中默认查看哪个环境、上传/部署函数到哪个环境、查看哪个数据库

**这两条线不是同一件事。**
不要假设“前端 build 是 prod”就等于“DevTools 当前环境也是 prod”。

## 环境切换脚本
推荐始终显式切换 DevTools 环境，不要手改 `project.config.json`。

```bash
npm run use:devtools:dev
npm run use:devtools:prod
```

脚本会修改：
- `project.config.json -> cloudenvironment`

## 常用命令
### 本地开发（dev）
```bash
npm install
npm run use:devtools:dev
npm run dev:weapp:dev
```

### 本地 prod build 核验
```bash
npm run build:weapp:prod:check
```

`build:weapp:prod:check` 会依次执行：
- `npm run typecheck`
- `npm run check:actions`
- `npm run build:weapp:prod`
- `npm run check:weapp:size`

## 正式上传 SOP
正式体验版 / 审核版 / 线上发布包只允许使用：

```bash
npm run build:weapp:prod
```

不要用裸 `npm run dev:weapp`、`npm run dev:weapp:dev` 或微信开发者工具里残留的 dev build 产物上传正式版本。

`build:weapp:prod` 会先执行 `use:devtools:prod-upload`，把 `project.config.json` 切到 prod CloudBase 环境，并设置：
- `minified = true`
- `uploadWithSourceMap = false`
- `compileHotReLoad = false`

上传前仍需人工确认：
- DevTools 当前 CloudBase 环境是 prod
- prod `appService` 已重新部署
- prod `admin_users` 中已有当前运营 openid 且 `isActive = true`
- prod 数据库集合权限与索引已按 `docs/CLOUDBASE_INDEXES.md` 配置

## 启动时日志
`src/app.ts` 会打印：
- runtime env
- runtime mode

用来快速确认当前编译产物实际连接的是哪个 CloudBase 环境。

## 重要原则
1. 默认把 DevTools 环境当成 **显式切换项**，不是隐式跟随 build
2. `.env.*` 只控制前端运行时 env，不会自动部署云函数、复制索引、权限或 admin 数据
3. 每次切 prod 前，都要先确认：
   - DevTools 当前环境
   - prod 云函数是否已部署
   - prod 函数 env vars 是否已配置
   - prod `admin_users` / collections / permissions 是否存在

## 进一步说明
更完整的开发 / 核验 / 部署流程见：
- `docs/DEV_VERIFY_DEPLOY_SOP.md`
- `docs/HANDOFF_ENV_NOTES.md`
