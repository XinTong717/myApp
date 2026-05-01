# 可雀小程序 - Current Status Handoff

Last updated: 2026-05-01
Product brand: **可雀**
Repo: `XinTong717/myApp`
Local path: `/Users/xintong/myApp`

This is the current operational status handoff. It supersedes older compact handoff notes where they conflict.

## 1. Product status

The WeChat mini-program is a working near-MVP for:

- map-based discovery
- structured learning-community browsing
- structured event browsing
- user-submitted learning community and event intake
- gated adult-to-adult connection
- profile/privacy/safety controls
- admin-mediated event review and one-click event publishing

It is intentionally **not**:

- a public social feed
- an open comment platform
- a youth-first registration product
- a precise navigation map

Current product model:

- **探索** = distribution/discovery map
- **学习社区** = structured resource library
- **活动** = recurring supply + structured intake + lightweight demand signal
- **我的** = identity, privacy, gated relationship, safety, admin entry

## 2. Current working surface

### Tabs

1. **探索**
   - learning-community and same-road-user layers
   - province filter
   - province-summary user aggregation
   - school/user cluster visual separation
   - school/user same-province clusters offset to reduce overlap
   - low-count national cluster labels hidden:
     - school cluster label only if count >= 3
     - user cluster label only if count >= 2
   - cluster labels visually lightened
   - user bottom-sheet popup
   - same-area user cluster bottom sheet
   - map data renders only after `validMarkers`
   - false empty-state flicker reduced with delayed empty state in `MapMarkers`
   - stale-response guard added in `ExplorePage.loadData`
   - school and user settled state now tracked together:
     - `schoolsLoaded`
     - `mapUsersLoadedKey`
   - marker construction extracted to `src/pages/explore/utils/markerBuilders.ts`
   - Explore index is slimmer, though still has remaining logic that can be extracted later

2. **学习社区**
   - list + keyword search
   - multi-select filters:
     - 地区
     - 类型
     - 阶段
   - filter semantics:
     - same dimension = OR
     - different dimensions = AND
   - server-side filtering through `getSchools`
   - detail page
   - recommend-new-community entry
   - list/detail use `school_locations`
   - multi-location display via `locations`
   - list click writes a 5-minute detail preview cache
   - detail page renders preview while full detail loads

3. **活动**
   - event list
   - online/offline filter
   - default hides ended events
   - detail page
   - `我感兴趣` toggle
   - interest counts
   - recommend-new-event entry
   - list click writes a 5-minute detail preview cache
   - detail page renders preview while full detail/contact/interest data loads

4. **我的**
   - step-based profile form:
     1. 基本资料
     2. 身份补充
     3. 隐私联络
   - save button appears only on final step
   - Step 1 validation before continuing
   - openid-scoped profile draft cache
   - privacy and safety controls
   - request/connection management
   - admin entry only for active admins

### Non-tab pages

- `pages/school-detail/index`
- `pkg/schools/submit/index`
- `pages/event-detail/index`
- `pkg/events/submit/index`
- `pages/admin/event-reviews/index`
- `pages/privacy-policy/index`

## 3. Important recent changes after previous handoff

### 3.1 Explore stability and visual cleanup

Completed:

- low-count cluster labels hidden in national view
- cluster label wording shortened and colors lightened
- false empty-state flicker reduced with delayed empty state
- `loadData` now uses request sequence guard to drop stale responses
- province/filter snapshots are captured before async requests
- map user and school data settled state are jointly checked before empty state
- marker builders extracted from `src/pages/explore/index.tsx`
- unused leftovers such as old `USER_CLUSTER_THRESHOLD` / `Coord` should be removed if local TS warnings remain

Files:

- `src/pages/explore/index.tsx`
- `src/pages/explore/components/MapMarkers.tsx`
- `src/pages/explore/utils/markerBuilders.ts`

### 3.2 Admin event publishing is now one-click

Previous older handoff said event publishing was semi-manual. That is now outdated.

Current event publishing path:

1. user submits event
2. event goes to `event_submissions.status = pending`
3. admin opens `pages/admin/event-reviews/index`
4. admin checks payload/warnings
5. admin clicks **一键发布到活动库**
6. `publishEventDirect` writes into `events`
7. submission becomes `merged`
8. `publishedEventId` is written back
9. event list cache is cleared on frontend success

Manual fallback remains:

- **仅回写已发布** means the admin already manually created an `events` row and only wants to sync the submission status.
- **重置待审核** changes the submission status back to pending, but does **not** delete an already-created event row.

Important backend details:

- `publishEventDirect` routes through `appService`, not a standalone function.
- frontend `ROUTED_ACTIONS` includes `publishEventDirect`.
- `adminPublish.js` guards event id allocation by checking conflicts and retrying.
- source submission duplication is prevented by `source_submission_id` lookup.
- event payload builder is shared between preview and publishing.

Files:

- `cloudfunctions/appService/handlers/adminPublish.js`
- `cloudfunctions/appService/lib/eventPublishPayload.js`
- `cloudfunctions/appService/handlers/admin.js`
- `src/pages/admin/event-reviews/index.tsx`
- `src/services/cloud.ts`

### 3.3 Content security / msgSecCheck

Current behavior:

- explicit violations block writes
- transient API failure or missing permission on scene 1/2 soft-passes into pending/manual review
- `contentSecurityStatus = check_failed` can be stored for human review paths

Important resolved issue:

- error `-604101 function has no permission to call this API` was an OpenAPI permission/config issue, not a content violation.
- repo now includes `cloudfunctions/appService/config.json` granting:

```json
{
  "permissions": {
    "openapi": ["security.msgSecCheck"]
  }
}
```

After any change here, redeploy `appService` into each target CloudBase environment.

Files:

- `cloudfunctions/appService/lib/security.js`
- `cloudfunctions/appService/config.json`

### 3.4 Rate limiting expanded

Previous state: mostly read action limits.

Current state: unified action rate limits include read, write, and admin actions.

Configured categories:

- `READ_ACTION_RATE_LIMITS`
- `WRITE_ACTION_RATE_LIMITS`
- `ADMIN_ACTION_RATE_LIMITS`
- combined `ACTION_RATE_LIMITS`

Important write/admin limits now include:

- `submitCorrection`
- `submitCommunity`
- `submitEvent`
- `sendRequest`
- `respondRequest`
- `manageConnection`
- `manageSafetyRelation`
- `reportUser`
- `toggleEventInterest`
- `updatePrivacySettings`
- `saveProfile`
- `publishEventDirect`
- `reviewEventSubmission`
- `getEventPublishPayload`
- `listEventSubmissions`

Files:

- `cloudfunctions/appService/lib/rateLimits.config.js`
- `cloudfunctions/appService/index.js`
- CloudBase collection: `rate_limits`

### 3.5 Submit form duplicate-tap locks

Added function-level sync locks with `useRef`, not only React state loading.

Files:

- `src/pkg/events/submit/index.tsx`
- `src/pkg/schools/submit/index.tsx`

This prevents weak-network double tap or repeated submit before React state updates.

### 3.6 Detail preview cache

Added a lightweight list-to-detail preview cache.

Current behavior:

- list click stores event/school preview for 5 minutes
- detail page checks preview first
- if preview exists, it renders immediately with a message
- full detail still loads and replaces preview

Files:

- `src/services/detailPreview.ts`
- `src/pages/events/index.tsx`
- `src/pages/schools/index.tsx`
- `src/pages/event-detail/index.tsx`
- `src/pages/school-detail/index.tsx`

### 3.7 appService boundary cleanup

`appService/index.js` now groups handlers before the eventual split:

- `publicActionHandlers`
- `userActionHandlers`
- `adminActionHandlers`

This does not split cloud functions yet. It makes a future split easier.

### 3.8 Build size checker

Added bundle-size tooling.

Commands:

```bash
npm run check:weapp:size
npm run build:weapp:prod:check
```

Checks:

- total `dist/` <= 20 MB
- package-like buckets <= 2 MB
- large files >= 500 KB

Files:

- `scripts/check-weapp-size.cjs`
- `package.json`

### 3.9 Recent CloudBase index checklist

Added:

- `docs/CLOUDBASE_RECENT_INDEX_CHECK.md`

This supplements the older index doc with recently changed queries for:

- `connections`
- `safety_relations`
- `users`
- `events`
- `event_submissions`

## 4. Current architecture

### Public content is CloudBase-first

Active collections:

- `schools`
- `school_locations`
- `events`

Active public-read path:

- frontend service -> `cloud.ts` -> `appService` -> `contentRepo.js` -> CloudBase

Active public content actions:

- `getSchools`
- `getSchoolDetail`
- `getEvents`
- `getEventDetail`

MemFire is not active in the mini-program frontend/public-read path. Treat old MemFire data as historical/archive unless deliberately reintroduced.

### School location model

`school_locations` is the location source of truth.

Do not write new comma-separated city data into `schools.city`.

If approving a community recommendation:

- new organization -> create `schools` + one or more `school_locations`
- existing organization but new city -> add `school_locations` row
- duplicate -> reject/merge without changing `schools.city`

### CloudBase sensitive/app-managed collections

Used collections:

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

Recommended permission posture:

```text
All users cannot read and write
Cloud functions read/write only
```

## 5. Environments

CloudBase envs:

- dev: `cloud1-9g8njw4c79fb1322`
- prod: `keque-prod-d5gc6ylp793fabaea`

Frontend env files:

- `.env.development` -> dev env id
- `.env.production` -> prod env id

Important discipline:

- `.env.*` only controls frontend runtime target env
- cloud functions must be deployed manually per env unless CI exists
- indexes, collection permissions, admin rows, OpenAPI permissions, and collection data are console/env state
- for any environment-sensitive task, always specify:
  1. dev/prod/both
  2. repo code / console state / data
  3. mirror exactly / semantically match / intentionally different

## 6. Current appService action inventory

Public content:

- `getSchools`
- `getSchoolDetail`
- `getEvents`
- `getEventDetail`

School migration/admin utility:

- `migrateSchoolLocations`
- `validateSchoolLocationsMigration`

User/profile:

- `getOpenId`
- `getMe`
- `saveProfile`
- `updatePrivacySettings`

Map/users:

- `getMapUsers`

Connections/safety:

- `sendRequest`
- `getMyRequests`
- `respondRequest`
- `manageConnection`
- `manageSafetyRelation`
- `getSafetyOverview`
- `reportUser`

Submissions/events:

- `submitCommunity`
- `submitEvent`
- `submitCorrection`
- `getEventInterestInfo`
- `getEventInterestCountsBatch`
- `toggleEventInterest`
- `getEventContactInfo`

Admin:

- `checkAdminAccess`
- `listEventSubmissions`
- `getEventPublishPayload`
- `publishEventDirect`
- `reviewEventSubmission`

## 7. Known unresolved items

### P0 / must verify now

1. Pull latest repo and compile:

```bash
git pull --rebase origin main
npm run dev:weapp:dev
```

2. Deploy backend changes:

```text
cloudfunctions/appService
Upload and deploy: cloud install dependencies
```

Do this in each target env that needs the new behavior.

3. Verify `appService/config.json` OpenAPI permission actually took effect in CloudBase console/deployed function.

4. Real-device regression test:

- Explore national/province switching
- fake empty state no longer flashes under normal network
- school/user cluster taps
- user popup -> send request/report/block
- submitCommunity duplicate-tap guard
- submitEvent duplicate-tap guard
- event admin one-click publish
- event list after publish
- detail preview render and full detail replacement

5. Run bundle size check:

```bash
npm run build:weapp:prod:check
```

### P1 / next build candidates

1. Community submission review workflow
   - approve as new `schools` + `school_locations`
   - merge as new `school_locations` for existing school
   - reject / duplicate
   - audit log

2. Corrections review workflow
   - currently still manual

3. Cache soft-expire / stale-while-revalidate
   - most useful for `getSchools`, `getEvents`, national `getMapUsers`
   - do not apply blindly to requests/safety/admin

4. More appService split preparation
   - first candidate: migration/admin utilities
   - later: map users if traffic grows

5. Map real-device validation
   - DevTools map/QQ route noise is low priority unless real device reproduces it

### P2 / later

- Bounding-box map loading
- user province summary materialized table
- CloudBase counters collection for event id allocation
- CSS variables / dark mode
- full automated environment provisioning

## 8. Not now

- public comments
- public feed
- open public profile network
- youth self-registration flow
- algorithmic matching rhetoric
- reintroducing frontend MemFire public reads
- big-bang cloud function split before prod baseline is stable

## 9. Operational reminders

- Do not edit `dist/`
- New pages must be registered in `src/app.config.ts`
- Active submit routes are under `pkg/...`
- `Map` must be imported as `TaroMap`
- map rendering should use `validMarkers`
- do not combine `includePoints` with manual `scale`
- event direct publish requires `publishEventDirect` in `ROUTED_ACTIONS`
- `migrateContent` is not found in current repo; if it still exists in CloudBase console, treat it as stale deployed residue and delete only after confirming no manual dependency
