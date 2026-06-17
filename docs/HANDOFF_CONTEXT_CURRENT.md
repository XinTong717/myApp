# 可雀小程序 - Current Context Handoff

Last updated: 2026-05-01
Product brand: **可雀**
Repo: `XinTong717/myApp`
Local path: `/Users/xintong/myApp`

This is the durable context handoff for future AI/dev sessions. Use `docs/HANDOFF_STATUS_CURRENT.md` for current status and immediate next actions.

## 1. Product thesis

可雀 is the WeChat mini-program layer for 自由学社 / Liberal Academy.

Current thesis:

- **探索地图** is the discovery entry.
- **学习社区资源库** is the structured content layer.
- **活动** supports recurring return, structured supply growth, and lightweight demand signal.
- **我的** supports identity, privacy, gated relationships, safety, and admin entry.
- Same-road-user connection is gated adult-to-adult contact, not public social networking.

The product is intentionally not:

- a public feed
- a public comment system
- a likes/reposts social network
- a youth-first account system
- a precise navigation product
- an open public profile network

Map philosophy:

```text
Approximate distribution browsing > precise navigation
Discovery and context > exact address targeting
Safety and privacy > social virality
```

## 2. User and safety boundary

Current version is adult-first.

Priority users:

- parents
- educators
- adult explorers/supporters around alternative education/self-directed learning

Current hard boundary:

- no under-18 self-registration path
- no student/youth role in the active profile UI
- server-side `saveProfile` should continue rejecting under-18/student bypass payloads

If youth-facing features come back later, treat them as a separate product decision, not an accidental extension of the current adult flow.

Trust/moderation boundary:

- no open comments
- no public DMs
- no public profile graph
- structured submissions go through moderation
- sensitive relationship actions go through CloudBase functions
- user visibility and incoming request permissions are user-controlled

## 3. Current architecture principles

### 3.1 CloudBase-first public content

Current mini-program public content path is CloudBase-first.

Active public content collections:

- `schools`
- `school_locations`
- `events`

Active public read actions:

- `getSchools`
- `getSchoolDetail`
- `getEvents`
- `getEventDetail`

Active backend read layer:

- `cloudfunctions/appService/lib/contentRepo.js`

Frontend service layer:

- `src/services/school.ts`
- `src/services/event.ts`
- `src/services/cloud.ts`

MemFire should not be reintroduced into frontend public reads unless there is an explicit architecture decision. Treat old MemFire data as historical/archive/source material.

### 3.2 School location model

`school_locations` is the source of truth for learning-community locations.

Conceptual schema:

```text
schools
- id
- canonical_name
- name
- description
- official_url
- school_type
- age_range
- fee
- has_xuji
- status
- ...

school_locations
- school_id
- province
- city
- address_note
- contact_note
- status
- source
```

Rules:

- Do not append comma-separated city values to `schools.city`.
- Do not make frontend list/detail/explore depend on legacy `schools.province/city`.
- If a school has no `school_locations`, show `locations: []`; that is a data issue, not a frontend fallback issue.
- Approving a same-organization/different-city community recommendation should add a `school_locations` row.
- Approving a truly new organization should create `schools` + `school_locations`.

Migration/admin utility actions still exist:

- `migrateSchoolLocations`
- `validateSchoolLocationsMigration`

They should be treated as admin/migration utility, not normal product surface.

### 3.3 appService architecture

Current backend uses consolidated cloud function:

- `appService`

It routes by `event.action`.

Current handler groups inside `appService/index.js`:

- `publicActionHandlers`
- `userActionHandlers`
- `adminActionHandlers`

This grouping is intentional split preparation. Do not big-bang split yet unless prod baseline is stable.

Best future split order:

1. migration/admin utilities
2. admin review/publishing
3. map users if traffic/cost grows
4. public reads last

`getOpenId` is an `appService` action, not a standalone cloud function.

### 3.4 Action routing from frontend

`src/services/cloud.ts` has `ROUTED_ACTIONS`.

Any new `appService` action must be added there, or the frontend will incorrectly call a standalone function named after the action and get:

```text
FunctionName parameter could not be found
```

This happened with `publishEventDirect` and was fixed by adding it to `ROUTED_ACTIONS`.

## 4. Current routes and packaging

Tabs:

- `pages/explore/index`
- `pages/schools/index`
- `pages/events/index`
- `pages/profile/index`

Also registered:

- `pages/privacy-policy/index`

Subpackages:

- `pkg/schools -> submit/index`
- `pkg/events -> submit/index`
- `pages/school-detail -> index`
- `pages/event-detail -> index`
- `pages/admin -> event-reviews/index`

Active submit routes:

- `/pkg/schools/submit/index`
- `/pkg/events/submit/index`

Future new non-tab pages should normally go under `pkg/` unless there is a clear reason not to.

## 5. Map implementation mental model

### Learning communities

Data source:

- `getSchools`
- `school.locations`
- `school_locations`

Coordinate behavior:

- frontend city coordinate lookup via `CITIES`
- fallback to province only when a location row lacks known city coordinate
- grid/hash jitter reduces overlap
- wording uses “地点” for location count

### Users

Data source:

- `getMapUsers`

Public map payload should remain narrow:

- display name
- roles
- province/city
- bio
- companion context
- isSelf

Do not expose:

- `wechatId`
- family education detail fields
- educator service detail fields
- openid

### Explore state rules

Important current stabilization rules:

- render only `validMarkers`
- map users and schools must both be settled before real empty state
- stale async responses are dropped with a request sequence guard
- `MapMarkers` delays empty-state display to avoid false “暂无数据” flashes
- map labels are intentionally lighter and lower-density in national view
- low-count national cluster labels are hidden
- user and school province clusters are visually distinct and offset

DevTools map route/QQ map noise is low priority unless real device reproduces it.

## 6. Event publishing model

Current state: event publishing is now one-click from admin review page.

Normal path:

1. user submits event
2. backend writes `event_submissions.status = pending`
3. admin opens activity review page
4. admin previews payload and warnings
5. admin clicks **一键发布到活动库**
6. `publishEventDirect` writes `events`
7. submission becomes `merged`
8. `publishedEventId` is written back
9. frontend clears event list cache after success

Important semantics:

- Do not auto-publish user-submitted events without admin action.
- Manual fallback **仅回写已发布** does not create an `events` row.
- **重置待审核** does not delete an already-created public `events` row.
- `source_submission_id` prevents duplicated direct publishing.
- event id allocation currently uses max id + conflict retry + timestamp fallback, not a true atomic counter.

Future improvement:

- use a `counters` collection with atomic increment for `events.id` if publish concurrency becomes real.

## 7. Community submission model

Current state:

- users can submit recommended learning communities
- rows go into `community_submissions`
- duplicate key is name + province + city
- content security check runs
- review workflow is not complete yet

Correct future admin workflow must respect `school_locations`:

- approve as new school -> create `schools` + `school_locations`
- approve as new location for existing school -> create only `school_locations`
- reject/duplicate -> update status and audit log

Do not solve this by appending cities into `schools.city`.

## 8. Content security / moderation

Backend uses:

- `cloud.openapi.security.msgSecCheck`

Current functions using content security include profile/submission/correction-style paths.

Repo config:

- `cloudfunctions/appService/config.json`
- grants OpenAPI permission for `security.msgSecCheck`

Current behavior:

- explicit violation blocks write
- scene 1/2 OpenAPI/transient failure soft-passes into pending/manual review
- logs include error code/message/scene/content length

Important known error:

```text
-604101 function has no permission to call this API
```

This means cloud function OpenAPI permission/config/deploy issue, not content violation.

Fix path:

1. ensure `appService/config.json` exists in repo
2. redeploy appService with cloud install dependencies
3. check correct env selected in CloudBase/DevTools

## 9. Rate limiting

Rate limit config lives in:

- `cloudfunctions/appService/lib/rateLimits.config.js`

Categories:

- read
- write
- admin

Counters stored in:

- `rate_limits`

Important:

- `rate_limits` collection must exist in each env
- collection permissions should be cloud-function-only
- missing config fallback exists in `appService/index.js` to avoid total boot failure

## 10. Frontend caching

Current cache concepts:

- user-scoped cache keys via openid
- prefix clearing via shared cache key prefixes
- map users cache clear across filter variants
- event list cache cleared after event interest and admin direct publish paths
- detail preview cache added:
  - memory + storage
  - 5-minute TTL
  - event and school preview before full detail loads

Future cache improvement:

- stale-while-revalidate / soft-expire for stable public reads:
  - `getSchools`
  - `getEvents`
  - national `getMapUsers`
- do not blindly apply soft-expire to:
  - safety
  - connection requests
  - admin review
  - privacy/profile updates

## 11. Environment model

CloudBase envs:

- dev: `cloud1-9g8njw4c79fb1322`
- prod: `keque-prod-v2-d8gfsxh8j16fba620`

Frontend env files:

- `.env.development`
- `.env.production`

Scripts:

- `npm run use:devtools:dev`
- `npm run use:devtools:prod`
- `npm run use:devtools:prod-upload`
- `npm run dev:weapp:dev`
- `npm run build:weapp:prod`
- `npm run build:weapp:prod:check`

Critical distinction:

- frontend runtime env
- DevTools current selected env
- CloudBase console selected env
- deployed cloud function code/config
- collection data
- collection indexes
- collection permissions
- admin allowlist rows

These are separate axes.

Any environment-sensitive task must state:

1. dev/prod/both
2. repo code / console state / env data
3. whether to mirror exactly, semantically match, or intentionally differ

## 12. Build and package discipline

Do not edit `dist/`.

Bundle size checker:

```bash
npm run build:weapp:prod:check
```

Added script checks:

- total dist size <= 20 MB
- package-like buckets <= 2 MB
- large files >= 500 KB

Use this before release or after large page/component additions.

## 13. UI / design system

Current source of truth:

- `src/theme/palette.ts`
- `src/theme/typography.ts`
- common components such as:
  - `AppIcon`
  - `FormInputBox`
  - `AppPrimaryButton`
  - `AdminActionButton`
  - `PillSelect`

Brand direction:

- warm paper
- terracotta/brand seal
- sage green for people/user layer
- soft, safe, independent, free

Avoid reintroducing old loose colors unless intentionally adding a token:

- `#E76F51`
- `#FCE6D6`
- `#FFF3E6`
- `#2F241B`
- `#7A6756`
- `#F1DFCF`
- `brandBright`
- `brightGradient`

Future design-system cleanup:

- write or maintain `docs/DESIGN_SYSTEM.md`
- stop adding naked emoji as functional icons
- prefer tokenized typography and shared inputs/buttons

CSS variables/dark mode are later work, not current priority.

## 14. CloudBase console state to verify

In both dev and prod, verify:

- latest `appService` deployed
- `appService/config.json` OpenAPI permission applied
- collections exist
- collection permissions are locked down
- indexes exist
- active admin row exists in `admin_users`
- `rate_limits` collection exists
- `schools`, `school_locations`, `events` data exists
- `validateSchoolLocationsMigration` returns ready state

Recent index doc:

- `docs/CLOUDBASE_RECENT_INDEX_CHECK.md`

Older env/deploy docs:

- `docs/HANDOFF_ENV_NOTES.md`
- `docs/DEV_VERIFY_DEPLOY_SOP.md`
- `docs/CLOUDBASE_INDEXES.md`

## 15. Immediate next likely work

Highest leverage next builds:

1. compile/regression after latest repo changes
2. redeploy appService in dev/prod as needed
3. verify one-click event publish on real data
4. community submission admin review workflow
5. corrections review workflow
6. cache soft-expire for public reads
7. real-device map regression
8. admin/migration split only after stable baseline

Do not jump to open social features.

## 16. Things future AI should not do

- Do not say event publishing is still manual-only; one-click direct publish now exists.
- Do not treat `msgSecCheck -604101` as content violation; it is permission/config/deploy issue.
- Do not re-add MemFire frontend public reads.
- Do not add new location logic based on comma-separated `schools.city`.
- Do not assume `.env.production` deploys cloud functions or copies indexes.
- Do not call `publishEventDirect` as a standalone cloud function.
- Do not edit `dist/`.
- Do not interpret DevTools map route noise as production failure without real-device evidence.
