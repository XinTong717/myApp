# CloudBase indexes and manual cleanup checklist

This project routes business actions through `cloudfunctions/appService` via `src/services/cloud.ts`.

After the legacy-function cleanup, only this cloud function should remain deployed in each environment:

- `appService`

`getOpenId` is now an `appService` action, not a standalone cloud function.

## Manual CloudBase cleanup

The repository cleanup removes legacy function source files only. You still need to delete old deployed functions in each CloudBase environment manually.

Do this separately for dev and prod:

1. Open WeChat DevTools.
2. Open CloudBase / 云开发 console.
3. Confirm the current environment.
4. Go to Cloud Functions / 云函数.
5. Keep only:
   - `appService`
6. Delete legacy standalone functions such as:
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

## Recommended indexes

Add these indexes in both dev and prod. The goal is to avoid slow scans as the user base grows.

### `users`

| Query path | Index fields |
|---|---|
| Profile lookup | `openid` |
| Duplicate display-name check | `displayName`, `openid` |
| Map user province summary | `isVisibleOnMap`, `province`, `city`, `displayName` |
| Province detail map users | `province`, `isVisibleOnMap`, `city`, `displayName` |

### `schools`

| Query path | Index fields |
|---|---|
| Public list | `status`, `id` |
| Detail lookup | `id`, `status` |
| Type filter | `status`, `school_type`, `id` |
| Age filter | `status`, `age_range`, `id` |

Note: `school_type` and `age_range` currently use fuzzy matching in code, so indexes may not fully eliminate scans for regex-like filters. Keep the fields normalized where possible.

### `school_locations`

| Query path | Index fields |
|---|---|
| Locations for school list/detail | `school_id`, `status` |
| Province filter / future admin review | `province`, `status` |
| City filter / future admin review | `province`, `city`, `status` |
| Migration idempotency | `_id` |

`school_locations` is the source of truth for map/display locations. Legacy `schools.province/city` should remain only as backward-compatible fields during the migration window.

### `events`

| Query path | Index fields |
|---|---|
| Public list | `status`, `start_time` |
| Detail lookup | `id`, `status` |

### `connections`

| Query path | Index fields |
|---|---|
| Sent requests | `fromOpenid`, `status`, `createdAt` |
| Received requests | `toOpenid`, `status`, `createdAt` |
| Existing connection checks | `fromOpenid`, `toOpenid`, `status` |
| Daily rate limit | `fromOpenid`, `createdAt` |

### `safety_relations`

| Query path | Index fields |
|---|---|
| My safety overview | `ownerOpenid`, `updatedAt` |
| Pair lookup | `ownerOpenid`, `targetOpenid` |
| Hidden-by-target lookup | `targetOpenid`, `isBlocked` |

### `event_interest`

| Query path | Index fields |
|---|---|
| Count interested users | `eventId`, `status` |
| User interest state | `eventId`, `openid`, `status` |

### `event_interest_counts`

| Query path | Index fields |
|---|---|
| Count cache lookup | `eventId` |

### `rate_limits`

| Query path | Index fields |
|---|---|
| Direct document lookup | `_id` |
| Future cleanup | `updatedAt` |

Current rate-limit documents use stable `_id = openid_action`, so `_id` lookup is the primary path.

### `event_submissions`

| Query path | Index fields |
|---|---|
| Admin review list | `status`, `createdAt` |
| Duplicate check | `normalizedKey`, `status` |
| User rate limit | `openid`, `createdAt` |
| Published contact lookup | `publishedEventId`, `status` |

### `community_submissions`

| Query path | Index fields |
|---|---|
| Duplicate check | `normalizedKey`, `status` |
| User rate limit | `openid`, `createdAt` |
| Future admin review list | `status`, `createdAt` |

### `user_reports`

| Query path | Index fields |
|---|---|
| Duplicate report check | `reporterOpenid`, `targetOpenid`, `createdAt` |

### `admin_users`

| Query path | Index fields |
|---|---|
| Admin access check | `openid`, `isActive` |

### `admin_audit_logs`

| Query path | Index fields |
|---|---|
| Admin history | `adminOpenid`, `createdAt` |
| Target history | `targetType`, `targetId`, `createdAt` |
| Action history | `action`, `createdAt` |

## Data hygiene notes

- New documents in `schools`, `school_locations`, and `events` should explicitly set `status: 'published'` or a similar non-deleted value. Avoid relying on missing `status` fields with `_.neq('deleted')`.
- `school_locations` should be updated through admin actions when a known school expands to a new city. Do not append comma-separated cities to `schools.city` for new data.
- Keep `schools.name` for backward compatibility, but prefer `schools.canonical_name` in new reads and admin workflows.

## Future local-only optimization patches

These are intentionally not applied in the current PR because they touch large files or require lockfile regeneration.

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
