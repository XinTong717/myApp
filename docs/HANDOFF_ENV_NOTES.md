# Handoff: Environment Notes

Last updated: 2026-05-11

This repo has two separate environment axes. Keep them separate during launch checks.

## 1. Environment axes

### Runtime CloudBase env

- Comes from `.env.development` / `.env.production`.
- Compiled into `__WEAPP_CLOUD_ENV_ID__`.
- Used by `Taro.cloud.init()` at runtime.

### DevTools / CloudBase console env

- Comes from `project.config.json -> cloudenvironment` and the DevTools environment dropdown.
- Affects what environment DevTools shows by default.
- Affects where console-driven cloud function deploys, database views, collection permissions, indexes, admin rows, and manual data edits land.

If these two are not checked explicitly, it is easy to think you are testing prod while still looking at dev console state.

## 2. Current environment IDs

| Environment | CloudBase env id |
|---|---|
| dev | `cloud1-9g8njw4c79fb1322` |
| prod | `keque-prod-v2-d8gfsxh8j16fba620` |

## 3. Commands

### Switch DevTools config

```bash
npm run use:devtools:dev
npm run use:devtools:prod
npm run use:devtools:prod-upload
```

### Dev watch

```bash
npm run dev:weapp:dev
```

### Prod build gate

```bash
npm run build:weapp:prod:check
```

This gate now includes:

- TypeScript check
- appService action manifest check
- legal version consistency check
- prod build
- mini-program package size check

## 4. Current backend architecture

Current mini-program backend entrypoint:

```text
appService
```

Current launch positioning:

```text
可雀当前不是社交私信产品，而是成年人自愿公开资料的教育探索成员目录。平台不做站内私信、不做好友申请、不做自动撮合；用户只能查看对方选择公开的渠道，并自行谨慎联系。
```

Do not create or verify removed social-connection resources such as `connections`, `sendRequest`, `respondRequest`, `getMyRequests`, or `manageConnection` for this launch.

## 5. Public structured content

Public structured content is CloudBase-first:

```text
schools
school_locations
events
```

`school_locations` is the source of truth for learning-community locations. Do not add new comma-separated city data into `schools.city`.

MemFire is no longer a required frontend/public-read dependency for the mini program. Do not debug prod public-content failures by first adding `MEMFIRE_API_*` function env vars; check `appService`, CloudBase collections, permissions, indexes, and data status first.

## 6. Important warning

Changing `.env.production` or `.env.development` does **not**:

- deploy `appService`
- copy indexes
- copy collection permissions
- copy admin rows
- copy CloudBase data
- copy migration state
- copy OpenAPI permission state
- copy CloudBase console configuration

Those remain manual console state unless later automated.

## 7. Minimum prod verification before trusting a prod test

Use `docs/PROD_LAUNCH_CHECKLIST.md` as the source of truth.

Minimum quick pass:

1. Confirm runtime logs in `src/app.ts` show prod env id: `keque-prod-v2-d8gfsxh8j16fba620`.
2. Confirm DevTools / CloudBase console current environment is prod.
3. Confirm `appService` exists in prod and is freshly deployed.
4. Confirm `appService/config.json` OpenAPI permission for `security.msgSecCheck` took effect in deployed prod function.
5. Confirm core actions work in prod:
   - `getOpenId`
   - `getSchools`
   - `getSchoolMarkers`
   - `getEvents`
   - `getMapUsers`
   - `getProfileBootstrap`
   - `checkAdminAccess`
   - `listEventSubmissions`
   - `listSchoolSubmissions`
6. Confirm prod collections exist:
   - `users`
   - `legal_consents`
   - `schools`
   - `school_locations`
   - `events`
   - `event_submissions`
   - `school_submissions`
   - `school_corrections`
   - `event_corrections`
   - `event_interest`
   - `event_interest_counts`
   - `admin_users`
   - `admin_audit_logs`
   - `safety_relations`
   - `user_reports`
   - `rate_limits`
   - `counters`
   - `client_error_logs`
   - `account_deletion_requests`
7. Confirm prod collection permissions are locked down:

```text
All users cannot read/write
Cloud functions read/write only
```

8. Confirm prod admin row exists in `admin_users` with `isActive = true`.
9. Confirm prod indexes match `docs/CLOUDBASE_RECENT_INDEX_CHECK.md`.

## 8. Most likely future foot-guns

### Foot-gun 1: Runtime prod, console dev

- build/runtime already points to prod
- DevTools console is still looking at dev

This creates false conclusions about deploy status and data state.

### Foot-gun 2: stale standalone cloud functions

Seeing old standalone cloud functions in CloudBase does not mean the current app still needs them.

Current source of truth is `appService` plus action routing in `cloudfunctions/appService/index.js`.

### Foot-gun 3: removed connection model

Do not re-create `connections` or indexes for `getMyRequests`. The launch product is a one-way adult public directory, not in-app connection management.
