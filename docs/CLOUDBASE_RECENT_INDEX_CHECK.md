# Recent CloudBase Index Check

Last updated: 2026-05-01

This file supplements `docs/CLOUDBASE_INDEXES.md` for the recent runtime changes around map users, connection pagination, and admin direct event publishing.

## Check these before prod deploy

### `connections`

Recent change: `getMyRequests` is now split and paginated by section.

Required indexes:

```text
fromOpenid ASC, status ASC, createdAt DESC
toOpenid ASC, status ASC, createdAt DESC
fromOpenid ASC, status ASC, respondedAt DESC
toOpenid ASC, status ASC, respondedAt DESC
fromOpenid ASC, toOpenid ASC, status ASC
```

Why:

- pending received: `toOpenid + status + createdAt DESC`
- pending sent: `fromOpenid + status + createdAt DESC`
- accepted-from: `fromOpenid + status + respondedAt DESC`
- accepted-to: `toOpenid + status + respondedAt DESC`
- duplicate/existing connection checks: `fromOpenid + toOpenid + status`

### `safety_relations`

Recent change: map users and connection lists now filter blocked/muted users.

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

### `users`

Recent change: map users use aggregate summary and province detail pagination.

Required indexes:

```text
openid ASC
isVisibleOnMap ASC, province ASC, city ASC, displayName ASC
province ASC, isVisibleOnMap ASC, city ASC, displayName ASC
```

Why:

- enrichment by openid
- national summary / visible users
- province detail user loading

### `events`

Recent change: admin can publish directly from `event_submissions` to `events`.

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

Recent change: admin review page lists submissions and direct publish updates status.

Required indexes:

```text
status ASC, createdAt DESC
normalizedKey ASC, status ASC
openid ASC, createdAt DESC
publishedEventId ASC, status ASC
```

## Smoke tests

Run these in dev first.

### Connections

```json
{ "action": "getMyRequests", "section": "pending", "offset": 0, "limit": 50 }
```

```json
{ "action": "getMyRequests", "section": "accepted", "offset": 0, "limit": 50 }
```

```json
{ "action": "getMyRequests", "section": "sent", "offset": 0, "limit": 50 }
```

Expected: `ok: true`, with `pages.<section>`.

### Map users

```json
{ "action": "getMapUsers" }
```

```json
{ "action": "getMapUsers", "province": "浙江", "offset": 0, "limit": 100 }
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
