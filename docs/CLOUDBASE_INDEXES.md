# CloudBase indexes and manual cleanup checklist

This project routes business actions through `cloudfunctions/appService` via `src/services/cloud.ts`.

Current backend function model:

```text
appService
```

`getOpenId`, `getSchools`, `getSchoolDetail`, `getEvents`, `getEventDetail`, `getMe`, `saveProfile`, `getMapUsers`, `submitCommunity`, `submitEvent`, and admin actions are `appService` actions, not required standalone cloud functions.

Public structured content is CloudBase-first:

```text
schools
school_locations
events
```

`school_locations` is the source of truth for learning-community display/filter/map locations.

---

## Manual CloudBase cleanup

The repository cleanup removes legacy function source files only. You may still see old deployed functions in CloudBase. Clean dev and prod separately.

1. Open WeChat DevTools.
2. Open CloudBase / 云开发 console.
3. Confirm the current environment: dev or prod.
4. Go to Cloud Functions / 云函数.
5. Keep:
   - `appService`
6. Legacy standalone functions can be deleted after confirming no compatibility need:
   - `getOpenId`
   - `getEvents`
   - `getSchools`
   - `getEventDetail`
   - `getSchoolDetail`
   - `submitCorrection`
   - `submitEvent`
   - `submitCommunity`
   - `getMe`
   - `saveProfile`
   - `updatePrivacySettings`
   - `getMapUsers`
   - `getMyRequests`
   - `sendRequest`
   - `getSafetyOverview`
   - `manageSafetyRelation`
   - `reportUser`

Do not delete `appService`.

---

## How to create indexes in CloudBase console

Do this separately in **dev** and **prod**.

For each collection:

1. Open CloudBase console.
2. Confirm the current environment.
3. Go to Database / 数据库.
4. Open the collection.
5. Open Index / 索引.
6. Click Create index / 新建索引.
7. Add fields in the exact order shown below.
8. Direction: use ascending / 升序 unless this document explicitly says descending.
9. Save and wait until the index status is ready / 已生效.

Naming convention suggestion:

```text
idx_<collection>_<field1>_<field2>_<field3>
```

CloudBase console may generate names automatically. That is fine. The important part is field order.

---

## Priority A indexes: create first

These are required for current public browsing, map, submissions, admin review, and rate limiting.

### `schools`

#### `idx_schools_status_id`

```text
status: ascending
id: ascending
```

Used by public list.

#### `idx_schools_id_status`

```text
id: ascending
status: ascending
```

Used by detail lookup.

#### `idx_schools_status_school_type_id`

```text
status: ascending
school_type: ascending
id: ascending
```

Used by type filter. Note: current code uses fuzzy matching for `school_type`, so this index may not fully eliminate scans until values are normalized.

#### `idx_schools_status_age_range_id`

```text
status: ascending
age_range: ascending
id: ascending
```

Used by age/stage filter. Note: current code uses fuzzy matching for `age_range`, so this index may not fully eliminate scans until values are normalized.

### `school_locations`

#### `idx_school_locations_school_id_status`

```text
school_id: ascending
status: ascending
```

Used by list/detail location attachment.

#### `idx_school_locations_province_status`

```text
province: ascending
status: ascending
```

Used by province filter and map/admin review flows.

#### `idx_school_locations_province_city_status`

```text
province: ascending
city: ascending
status: ascending
```

Used by city filter and future community review merge flows.

### `events`

#### `idx_events_status_start_time`

```text
status: ascending
start_time: ascending
```

Used by public event list.

#### `idx_events_id_status`

```text
id: ascending
status: ascending
```

Used by event detail lookup.

### `users`

#### `idx_users_openid`

```text
openid: ascending
```

Used by profile lookup. If `_id = openid` is consistently used everywhere, `_id` lookup is already primary, but this index is useful for compatibility queries.

#### `idx_users_displayName_openid`

```text
displayName: ascending
openid: ascending
```

Used by duplicate display-name check.

#### `idx_users_visible_province_city_displayName`

```text
isVisibleOnMap: ascending
province: ascending
city: ascending
displayName: ascending
```

Used by map user summary / visible users.

#### `idx_users_province_visible_city_displayName`

```text
province: ascending
isVisibleOnMap: ascending
city: ascending
displayName: ascending
```

Used by province detail map users.

### `connections`

#### `idx_connections_from_status_createdAt`

```text
fromOpenid: ascending
status: ascending
createdAt: descending
```

Used by sent requests and sender-side request list.

#### `idx_connections_to_status_createdAt`

```text
toOpenid: ascending
status: ascending
createdAt: descending
```

Used by received requests.

#### `idx_connections_pair_status`

```text
fromOpenid: ascending
toOpenid: ascending
status: ascending
```

Used by existing connection checks.

#### `idx_connections_from_createdAt`

```text
fromOpenid: ascending
createdAt: descending
```

Used by daily send-request rate checks.

### `community_submissions`

#### `idx_community_submissions_status_createdAt`

```text
status: ascending
createdAt: descending
```

Used by future admin review list.

#### `idx_community_submissions_normalizedKey_status`

```text
normalizedKey: ascending
status: ascending
```

Used by duplicate check.

#### `idx_community_submissions_openid_createdAt`

```text
openid: ascending
createdAt: descending
```

Used by submitter 24h rate limit.

### `event_submissions`

#### `idx_event_submissions_status_createdAt`

```text
status: ascending
createdAt: descending
```

Used by admin event review list.

#### `idx_event_submissions_normalizedKey_status`

```text
normalizedKey: ascending
status: ascending
```

Used by duplicate check.

#### `idx_event_submissions_openid_createdAt`

```text
openid: ascending
createdAt: descending
```

Used by submitter 24h rate limit.

#### `idx_event_submissions_publishedEventId_status`

```text
publishedEventId: ascending
status: ascending
```

Used by published event contact lookup.

### `rate_limits`

#### `idx_rate_limits_updatedAt`

```text
updatedAt: ascending
```

Used by future cleanup.

Note: current rate-limit docs use stable `_id = openid_action`; direct doc lookup by `_id` does not need a custom index.

### `admin_users`

#### `idx_admin_users_openid_isActive`

```text
openid: ascending
isActive: ascending
```

Used by admin access check.

### `admin_audit_logs`

#### `idx_admin_audit_logs_adminOpenid_createdAt`

```text
adminOpenid: ascending
createdAt: descending
```

Used by admin history.

#### `idx_admin_audit_logs_targetType_targetId_createdAt`

```text
targetType: ascending
targetId: ascending
createdAt: descending
```

Used by target history.

#### `idx_admin_audit_logs_action_createdAt`

```text
action: ascending
createdAt: descending
```

Used by action history.

---

## Priority B indexes: create after A

### `safety_relations`

#### `idx_safety_relations_owner_updatedAt`

```text
ownerOpenid: ascending
updatedAt: descending
```

Used by my safety overview.

#### `idx_safety_relations_owner_target`

```text
ownerOpenid: ascending
targetOpenid: ascending
```

Used by pair lookup.

#### `idx_safety_relations_target_isBlocked`

```text
targetOpenid: ascending
isBlocked: ascending
```

Used by hidden-by-target lookup.

### `event_interest`

#### `idx_event_interest_eventId_status`

```text
eventId: ascending
status: ascending
```

Used by interest count source fallback.

#### `idx_event_interest_eventId_openid_status`

```text
eventId: ascending
openid: ascending
status: ascending
```

Used by user interest state fallback.

Note: current stable doc id is `event_${eventId}_${openid}`, so direct doc lookup is primary. These indexes support fallback / legacy data.

### `event_interest_counts`

#### `idx_event_interest_counts_eventId`

```text
eventId: ascending
```

Used by count cache lookup. If `_id = eventId` is consistently used, `_id` lookup is already primary, but this index helps compatibility queries.

### `user_reports`

#### `idx_user_reports_reporter_target_createdAt`

```text
reporterOpenid: ascending
targetOpenid: ascending
createdAt: descending
```

Used by duplicate report checks.

### `corrections`

#### `idx_corrections_status_createdAt`

```text
status: ascending
createdAt: descending
```

Used by future corrections review queue.

#### `idx_corrections_schoolId_createdAt`

```text
schoolId: ascending
createdAt: descending
```

Used by school-specific correction history.

---

## Copy checklist

Use this as the console checklist. Tick each row in dev, then repeat in prod.

```text
[ ] schools: status + id
[ ] schools: id + status
[ ] schools: status + school_type + id
[ ] schools: status + age_range + id

[ ] school_locations: school_id + status
[ ] school_locations: province + status
[ ] school_locations: province + city + status

[ ] events: status + start_time
[ ] events: id + status

[ ] users: openid
[ ] users: displayName + openid
[ ] users: isVisibleOnMap + province + city + displayName
[ ] users: province + isVisibleOnMap + city + displayName

[ ] connections: fromOpenid + status + createdAt(desc)
[ ] connections: toOpenid + status + createdAt(desc)
[ ] connections: fromOpenid + toOpenid + status
[ ] connections: fromOpenid + createdAt(desc)

[ ] community_submissions: status + createdAt(desc)
[ ] community_submissions: normalizedKey + status
[ ] community_submissions: openid + createdAt(desc)

[ ] event_submissions: status + createdAt(desc)
[ ] event_submissions: normalizedKey + status
[ ] event_submissions: openid + createdAt(desc)
[ ] event_submissions: publishedEventId + status

[ ] rate_limits: updatedAt

[ ] admin_users: openid + isActive

[ ] admin_audit_logs: adminOpenid + createdAt(desc)
[ ] admin_audit_logs: targetType + targetId + createdAt(desc)
[ ] admin_audit_logs: action + createdAt(desc)

[ ] safety_relations: ownerOpenid + updatedAt(desc)
[ ] safety_relations: ownerOpenid + targetOpenid
[ ] safety_relations: targetOpenid + isBlocked

[ ] event_interest: eventId + status
[ ] event_interest: eventId + openid + status

[ ] event_interest_counts: eventId

[ ] user_reports: reporterOpenid + targetOpenid + createdAt(desc)

[ ] corrections: status + createdAt(desc)
[ ] corrections: schoolId + createdAt(desc)
```

---

## Collection permission recommendation

For current app-managed collections, use:

```text
所有用户不可读写
仅云函数可读写
```

Apply to:

```text
users
connections
corrections
community_submissions
event_submissions
event_interest
event_interest_counts
admin_users
admin_audit_logs
safety_relations
user_reports
rate_limits
schools
school_locations
events
```

---

## Data hygiene notes

- New documents in `schools`, `school_locations`, and `events` should explicitly set `status: 'published'` or a similar non-deleted value.
- Current `contentRepo` filters deleted-like statuses after reads. Still, explicit status is safer than relying on missing fields.
- Deleted-like statuses hidden from public reads:
  - `deleted`
  - `removed`
  - `archived`
- `school_locations` should be updated through admin actions when a known school expands to a new city.
- Do not append comma-separated cities to `schools.city` for new data.
- Keep `schools.name` for backward compatibility, but prefer `schools.canonical_name` in new reads and admin workflows.

---

## Future local-only optimization patches

These are intentionally not applied in the current doc update because they touch runtime code or require lockfile regeneration.

### Remove non-WeApp Taro dependencies

Run locally, then commit both `package.json` and `package-lock.json`:

```bash
npm uninstall \
  @tarojs/plugin-platform-alipay \
  @tarojs/plugin-platform-tt \
  @tarojs/plugin-platform-swan \
  @tarojs/plugin-platform-jd \
  @tarojs/plugin-platform-qq \
  @tarojs/plugin-platform-h5 \
  @tarojs/plugin-platform-harmony-hybrid \
  react-dom

npm install
npm run dev:weapp:dev
```

### Remove `saveProfile` post-save read

In `cloudfunctions/appService/handlers/userV2.js`, replace the final post-save read:

```js
const latest = await db.collection('users').doc(openid).get()
return ok(requestId, { mode: canonicalDoc ? 'update' : 'create', profile: normalizeProfile(latest.data || null) })
```

with:

```js
return ok(requestId, {
  mode: canonicalDoc ? 'update' : 'create',
  profile: normalizeProfile({ ...dataToSave, _id: openid }),
})
```

This saves one database read per profile save. Test profile save, privacy toggles, and map visibility after applying.

### Consolidate `getMyRequests`

`getMyRequests` can be reduced further, but this should be done after indexes are in place. Keep the response shape stable:

```js
{ pending, accepted, sent }
```

Suggested direction:

- Keep `safety_relations` as a separate first query.
- Keep pending-received and sent-pending separate unless CloudBase compound indexes are confirmed.
- Consider merging accepted-from and accepted-to only if `_or` style querying is verified in the current CloudBase SDK/runtime.

Avoid clever query consolidation that makes the function harder to debug. This endpoint is user-facing identity/relationship infrastructure, not a place for spreadsheet-goblin SQL golf.
