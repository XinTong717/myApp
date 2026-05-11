# 可雀小程序 - Current Status Handoff

Last updated: 2026-05-11
Product brand: **可雀**
Repo: `XinTong717/myApp`
Local path: `/Users/xintong/myApp`

This is the current operational status handoff for launch. It supersedes older handoff notes where they conflict.

## 1. Launch positioning

Current product boundary:

```text
可雀当前不是社交私信产品，而是成年人自愿公开资料的教育探索成员目录。平台不做站内私信、不做好友申请、不做自动撮合；用户只能查看对方选择公开的渠道，并自行谨慎联系。
```

The WeChat mini-program is a near-MVP for:

- map-based discovery
- structured learning-community browsing
- structured event browsing
- user-submitted learning-community and event intake
- adult public member directory
- profile/privacy/safety controls
- admin-mediated event review and direct event publishing
- admin-mediated school recommendation processing

It is intentionally **not**:

- a public social feed
- an open comment platform
- a youth-first registration product
- an in-app messaging product
- a friend-request / connection-request product
- an algorithmic matching or auto-matching product
- a precise navigation map

Do **not** re-create removed resources such as `connections`, `sendRequest`, `respondRequest`, `getMyRequests`, `manageConnection`, or `submitCommunity` for launch.

## 2. Current working surface

### Tabs

1. **探索**
   - learning-community and adult-member layers
   - province filter
   - province-summary user aggregation
   - school/user cluster visual separation
   - user bottom-sheet popup
   - same-area user cluster bottom sheet
   - map renders only after valid markers are available
   - onboarding modal now waits until map data is loaded and visible markers exist
   - unauthenticated/incomplete-profile banner now gives three paths:
     - go fill profile
     - browse learning communities
     - browse events
   - `getMe({ allowStale: true })` is used for profile-status checks to reduce unnecessary cloud calls

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
   - filter options now come from backend `getFilterOptions`, derived from `school_locations` and `schools`
   - detail page
   - recommend-new-community entry
   - list/detail use `school_locations`
   - multi-location display via `locations`
   - list click writes a 5-minute detail preview cache
   - detail page renders preview while full detail loads

3. **活动**
   - event list
   - default public list limit: 100
   - backend max event list limit: 200
   - active-event scan limit: 300
   - online/offline filter
   - default hides ended events
   - detail page
   - `我感兴趣` toggle
   - interest counts
   - recommend-new-event entry
   - list click writes a 5-minute detail preview cache
   - detail cache TTL is 2 minutes during launch, so admin edits propagate quickly
   - detail page renders preview while full detail/contact/interest data loads

4. **我的**
   - step-based profile form:
     1. 基本资料
     2. 身份补充
     3. 目录设置
   - save button appears only on final step
   - Step 1 validation before continuing
   - Step 1 and Step 2 button copy says final save is on the last step
   - openid-scoped profile draft cache
   - privacy and safety controls
   - account deletion request entry
   - admin entry only for active admins

### Non-tab pages

- `pages/school-detail/index`
- `pkg/schools/submit/index`
- `pages/event-detail/index`
- `pkg/events/submit/index`
- `pkg/legal/user-agreement/index`
- `pkg/legal/privacy-policy/index`
- `pages/admin/index`
- `pages/admin/event-reviews/index`
- `pages/admin/school-submissions/index`

## 3. Current backend architecture

Current mini-program backend entrypoint:

```text
appService
```

Active public-read path:

```text
frontend service -> src/services/cloud.ts -> appService -> handlers/lib -> CloudBase
```

Current handler groups:

- public content / filter options
- event contact
- user profile / privacy / safety
- map users
- legal consent
- admin review / publish
- client error breadcrumbs

Do not treat old standalone cloud functions as required just because they still exist in CloudBase console. Source of truth is `appService` action routing in `cloudfunctions/appService/index.js`.

## 4. Active public content collections

Public structured content is CloudBase-first:

- `schools`
- `school_locations`
- `events`

`school_locations` is the location source of truth.

Do not write new comma-separated city data into `schools.city`. For new data:

- canonical learning-community row -> `schools`
- each operating location -> one row in `school_locations`
- use `status: published | draft | archived`
- use `source_submission_id` when the location came from a user recommendation

See also:

- `docs/SCHOOL_LOCATIONS_DATA_RULES.md`

MemFire is not active in the mini-program frontend/public-read path.

## 5. Active CloudBase collections for launch

Required / expected prod collections:

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

Recommended permission posture:

```text
All users cannot read/write
Cloud functions read/write only
```

## 6. Current appService action inventory

Public / content:

- `getOpenId`
- `getFilterOptions`
- `getSchools`
- `getSchoolMarkers`
- `getSchoolDetail`
- `getEvents`
- `getEventDetail`

Submissions / corrections / interest:

- `submitCorrection`
- `submitSchool`
- `submitEvent`
- `getEventInterestCountsBatch`
- `getEventInterestInfo`
- `toggleEventInterest`
- `getMyFavoriteEvents`
- `getEventContactInfo`

User/profile/legal/safety:

- `getMe`
- `getProfileBootstrap`
- `saveProfile`
- `updatePrivacySettings`
- `requestAccountDeletion`
- `getSafetyOverview`
- `getMapUsers`
- `manageSafetyRelation`
- `reportUser`
- `recordLegalConsent`
- `getLegalConsentStatus`

Admin:

- `checkAdminAccess`
- `listEventSubmissions`
- `getEventPublishPayload`
- `publishEventDirect`
- `reviewEventSubmission`
- `listSchoolSubmissions`
- `reviewSchoolSubmission`

Diagnostics:

- `logClientError`

Action manifest checking is enforced by:

```bash
npm run check:actions
```

## 7. Important recent launch changes

### 7.1 Admin event publishing

Current event publishing path:

1. user submits event
2. event goes to `event_submissions.status = pending`
3. admin opens `pages/admin/event-reviews/index`
4. admin checks payload/warnings/content security status
5. admin clicks **一键发布到活动库**
6. `publishEventDirect` writes into `events`
7. submission becomes `merged`
8. `publishedEventId` is written back
9. event list cache is cleared on frontend success

Manual fallback remains:

- **仅回写已发布** means the admin already manually created an `events` row and only wants to sync the submission status.
- **重置待审核** changes the submission status back to pending, but does **not** delete an already-created event row.

### 7.2 School recommendation review

Current launch scope: manual review/processing, not automatic write to `schools + school_locations`.

Path:

1. user submits learning-community recommendation
2. row goes to `school_submissions.status = pending`
3. admin opens `pages/admin/school-submissions/index`
4. admin copies structured submission text
5. admin manually creates/updates `schools` and `school_locations`
6. admin marks submission as:
   - `processed`
   - `duplicate`
   - `rejected`
   - or resets to `pending`

### 7.3 Content security / msgSecCheck

Current behavior:

- explicit violations hard-block writes
- transient API failure can soft-pass for review paths
- `contentSecurityStatus = check_failed` can be stored for human review
- profile save uses scene 1 but now `softPassOnFailure: true`; hard blocks still block, API failure does not prevent profile creation
- profile saves write `profileContentSecurityStatus` / related fields to `users`

Important permission:

`cloudfunctions/appService/config.json` grants:

```json
{
  "permissions": {
    "openapi": ["security.msgSecCheck"]
  }
}
```

After any change here, redeploy `appService` into each target CloudBase environment.

### 7.4 Legal consent

Legal consent versions are defined in both frontend and backend:

- `src/constants/legal.ts`
- `cloudfunctions/appService/lib/legalConsent.js`

Consistency is enforced by:

```bash
npm run check:legal-version
```

This is part of:

```bash
npm run build:weapp:prod:check
```

### 7.5 Client error breadcrumbs

Global `wx.onError` and `wx.onUnhandledRejection` now upload sanitized 10% sampled breadcrumbs to `client_error_logs` through `logClientError`.

Only short operational metadata is uploaded:

- source
- short message first line
- page
- runtime env
- cloud env

Do not upload user input, arbitrary payloads, or full stack traces.

### 7.6 Bundle size checker

Commands:

```bash
npm run check:weapp:size
npm run build:weapp:prod:check
```

Hard limits:

- total `dist/` <= 20 MB
- package-like buckets <= 2 MB

Warning budgets:

- main package > 1.6 MB
- total dist > 16 MB

## 8. Current build gate

Run before every upload:

```bash
git pull --rebase origin main
npm run build:weapp:prod:check
```

This runs:

1. `tsc --noEmit`
2. `check:actions`
3. `check:legal-version`
4. prod build
5. package size check

## 9. Prod verification source of truth

Use:

- `docs/PROD_LAUNCH_CHECKLIST.md`
- `docs/CLOUDBASE_RECENT_INDEX_CHECK.md`
- `docs/HANDOFF_ENV_NOTES.md`

Do not use older notes that mention `connections`, `getMyRequests`, or `submitCommunity`.

## 10. Known unresolved / next build candidates

### P0 / must verify now

1. Deploy `cloudfunctions/appService` to prod with cloud-installed dependencies.
2. Confirm `security.msgSecCheck` OpenAPI permission took effect in prod.
3. Confirm prod collections and permissions match `docs/PROD_LAUNCH_CHECKLIST.md`.
4. Confirm prod indexes match `docs/CLOUDBASE_RECENT_INDEX_CHECK.md`.
5. Real-device regression:
   - Explore national/province switching
   - onboarding appears only after loaded map content
   - school/user cluster taps
   - user popup report/block
   - submit school duplicate-tap guard
   - submit event duplicate-tap guard
   - event admin one-click publish
   - school recommendation manual review status update
   - event list after publish
   - detail preview render and full detail replacement
   - profile save when msgSecCheck permission/API is temporarily unavailable

### P1 / soon after launch

1. Corrections review workflow
   - currently still manual
2. Account deletion admin UI or script
   - launch SOP exists in `docs/ACCOUNT_DELETION_ADMIN_SOP.md`
3. More appService split preparation
   - first candidate: migration/admin utilities
4. Map real-device validation
   - DevTools map/QQ route noise is low priority unless real device reproduces it
5. Asset cleanup
   - only delete unused images after local grep + prod build confirms no references

### P2 / later

- Bounding-box map loading
- user province summary materialized table
- full automated environment provisioning
- saveProfile schema-versioned partial update path
- userProfile.js / userV2.js naming cleanup

## 11. Not now

- public comments
- public feed
- open youth self-registration flow
- algorithmic matching rhetoric
- reintroducing frontend MemFire public reads
- big-bang cloud function split before prod baseline is stable
- renaming `userV2.js` before launch
- partial saveProfile behavior change before launch

## 12. Operational reminders

- Do not edit `dist/`
- New pages must be registered in `src/app.config.ts`
- Active submit routes are under `pkg/...`
- `Map` must be imported as `TaroMap`
- map rendering should use `validMarkers`
- do not combine `includePoints` with manual `scale`
- event direct publish requires `publishEventDirect` in `ROUTED_ACTIONS`
- if old standalone cloud functions still exist in CloudBase console, treat them as stale deployed residue until confirmed otherwise
