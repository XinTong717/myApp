# Handoff: Environment Notes

## Why this exists

This repo has two separate environment axes:

1. **Runtime CloudBase env**
   - Comes from `.env.development` / `.env.production`.
   - Compiled into `__WEAPP_CLOUD_ENV_ID__`.
   - Used by `Taro.cloud.init()` at runtime.

2. **DevTools / CloudBase console env**
   - Comes from `project.config.json -> cloudenvironment` and the DevTools environment dropdown.
   - Affects what environment DevTools shows by default.
   - Affects where console-driven cloud function deploys, database views, collection permissions, indexes, admin rows, and manual data edits land.

If these two are not checked explicitly, it is easy to think you are testing prod while still looking at dev console state.

## Current environment IDs

| Environment | CloudBase env id |
|---|---|
| dev | `cloud1-9g8njw4c79fb1322` |
| prod | `keque-prod-d5gc6ylp793fabaea` |

## Current explicit switching commands

```bash
npm run use:devtools:dev
npm run use:devtools:prod
```

## Current build commands

### dev local watch

```bash
npm run dev:weapp:dev
```

### prod build verification

```bash
npm run build:weapp:prod
```

## Current backend architecture

Current mini-program backend entrypoint:

```text
appService
```

Important actions such as `getOpenId`, `getSchools`, `getSchoolDetail`, `getEvents`, `getEventDetail`, `getMe`, `saveProfile`, `getMapUsers`, `submitCommunity`, `submitEvent`, and admin review actions are `appService` actions. They should not be treated as required standalone cloud functions.

Public structured content is now CloudBase-first:

```text
schools
school_locations
events
```

`school_locations` is the source of truth for learning-community locations. Do not add new comma-separated city data into `schools.city`.

MemFire is no longer a required frontend/public-read dependency for the mini program. Do not debug prod public-content failures by first adding `MEMFIRE_API_*` function env vars; check `appService`, CloudBase collections, permissions, indexes, and data status first.

## Important warning

Changing `.env.production` or `.env.development` does **not**:

- deploy `appService`
- copy indexes
- copy collection permissions
- copy admin rows
- copy CloudBase data
- copy migration state
- copy CloudBase console configuration

Those remain manual console state unless later automated.

## Minimum prod verification before trusting a prod test

1. Confirm runtime logs in `src/app.ts` show prod env id: `keque-prod-d5gc6ylp793fabaea`.
2. Confirm DevTools / CloudBase console current environment is prod.
3. Confirm `appService` exists in prod and is freshly deployed.
4. Confirm key `appService` actions work in prod:
   - `getOpenId`
   - `getSchools`
   - `getEvents`
   - `validateSchoolLocationsMigration`
5. Confirm prod collections exist:
   - `users`
   - `connections`
   - `corrections`
   - `community_submissions`
   - `event_submissions`
   - `event_interest`
   - `event_interest_counts`
   - `admin_users`
   - `admin_audit_logs`
   - `safety_relations`
   - `user_reports`
   - `rate_limits`
   - `schools`
   - `school_locations`
   - `events`
6. Confirm prod collection permissions are locked down.
7. Confirm prod admin row exists in `admin_users` with `isActive = true`.
8. Confirm prod indexes match `docs/CLOUDBASE_INDEXES.md`.
9. Confirm strict location validation returns:

```text
missingCount = 0
readyForStrictLocations = true
```

## Most likely future foot-gun

The easiest mistake is:

- build/runtime already points to prod
- but DevTools console is still looking at dev

That creates false conclusions about deploy status and data state.

Second easiest mistake:

- seeing old standalone cloud functions in CloudBase
- assuming the current app still needs them

Current source of truth is `appService` plus action routing in `cloudfunctions/appService/index.js`.
