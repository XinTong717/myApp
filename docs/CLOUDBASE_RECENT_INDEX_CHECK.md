# Recent CloudBase Index Check

Last updated: 2026-05-11

This file supplements `docs/CLOUDBASE_INDEXES.md` and `docs/PROD_LAUNCH_CHECKLIST.md` for the current launch runtime.

Current product boundary:

```text
可雀当前不是社交私信产品，而是成年人自愿公开资料的教育探索成员目录。平台不做站内私信、不做好友申请、不做自动撮合；用户只能查看对方选择公开的渠道，并自行谨慎联系。
```

Do **not** create `connections` indexes or smoke-test `getMyRequests`; those actions are not part of the current launch scope.

## Required indexes before prod deploy

### `users`

Required indexes:

```text
openid ASC
isVisibleOnMap ASC, province ASC, city ASC, displayName ASC
province ASC, isVisibleOnMap ASC, city ASC, displayName ASC
```

Why:

- profile lookup/enrichment by openid
- national summary / visible users
- province detail user loading

### `safety_relations`

Required indexes:

```text
ownerOpenid ASC
targetOpenid ASC, isBlocked ASC
ownerOpenid ASC, targetOpenid ASC
```

Why:

- current user's hidden set: `ownerOpenid`
- users who blocked current user: `targetOpenid + isBlocked`
- pair lookup/update: `ownerOpenid + targetOpenid`

### `events`

Required indexes:

```text
id DESC
id ASC
source_submission_id ASC
status ASC, start_time ASC
id ASC, status ASC
```

Why:

- allocate next event id: `id DESC`
- conflict check by id: `id ASC`
- prevent duplicate direct publish: `source_submission_id`
- public list/detail: `status + start_time`, `id + status`

### `event_submissions`

Required indexes:

```text
status ASC, createdAt DESC
normalizedKey ASC, status ASC
openid ASC, createdAt DESC
publishedEventId ASC, status ASC
```

Why:

- admin review list
- duplicate submission prevention
- user daily limit / audit trace
- contact lookup by published event id

### `school_submissions`

Required indexes:

```text
status ASC, createdAt DESC
normalizedKey ASC, status ASC
openid ASC, createdAt DESC
```

Why:

- admin review list
- duplicate recommendation prevention
- user daily limit / audit trace

### `school_locations`

Recommended indexes:

```text
school_id ASC
province ASC, city ASC, status ASC
```

Why:

- attach locations to schools
- filter communities by province/city
- generate school filter options from published locations

### `event_interest`

Recommended indexes:

```text
openid ASC, status ASC, updatedAt DESC
eventId ASC, status ASC
```

Why:

- user's interested events list
- interest count validation / future backfill

### `event_interest_counts`

Recommended:

```text
_id document lookup/update works
```

Why:

- public activity list interest counts

### `legal_consents`

Recommended:

```text
_id / openid document lookup works
```

Why:

- legal gate for write actions

### `rate_limits`

Recommended:

```text
_id document lookup/update works
```

Why:

- action-level rate limit state

### `counters`

Recommended:

```text
_id = events document lookup/update works
```

Why:

- direct event publish id allocation

## Smoke tests

Run these in dev first, then prod.

### Map users

```json
{ "action": "getMapUsers" }
```

```json
{ "action": "getMapUsers", "province": "浙江", "offset": 0, "limit": 100 }
```

Expected: `ok: true`.

### Public content

```json
{ "action": "getSchoolMarkers", "limit": 200 }
```

```json
{ "action": "getSchools", "limit": 50 }
```

```json
{ "action": "getEvents", "includeInterestCounts": true }
```

Expected: `ok: true`.

### Direct event publish

First list pending submissions:

```json
{ "action": "listEventSubmissions", "status": "pending", "limit": 5 }
```

Then use a real `_id`:

```json
{ "action": "publishEventDirect", "submissionId": "REAL_EVENT_SUBMISSION_ID" }
```

Expected:

- success with `publishedEventId`, or
- `PUBLISH_BLOCKED` with actionable blocking reasons.

Do not use placeholder text as `submissionId`.

### School submission review

```json
{ "action": "listSchoolSubmissions", "status": "pending", "limit": 5 }
```

Then use a real `_id`:

```json
{ "action": "reviewSchoolSubmission", "submissionId": "REAL_SCHOOL_SUBMISSION_ID", "reviewAction": "mark_processed" }
```

Expected: `ok: true` and audit log written.
