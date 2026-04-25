# CloudBase indexes and manual cleanup checklist

This project routes business actions through `cloudfunctions/appService` via `src/services/cloud.ts`.

After merging the legacy-function cleanup PR, only these cloud functions should remain deployed:

- `appService`
- `getOpenId`

## Manual CloudBase cleanup

The repository cleanup removes legacy function source files only. You still need to delete old deployed functions in each CloudBase environment manually.

Do this separately for dev and prod:

1. Open WeChat DevTools.
2. Open CloudBase / 云开发 console.
3. Confirm the current environment.
4. Go to Cloud Functions / 云函数.
5. Keep only:
   - `appService`
   - `getOpenId`
6. Delete legacy functions such as:
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
| Map users | `isVisibleOnMap`, `province`, `city`, `displayName` |

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

### `user_reports`

| Query path | Index fields |
|---|---|
| Duplicate report check | `reporterOpenid`, `targetOpenid`, `createdAt` |

### `admin_users`

| Query path | Index fields |
|---|---|
| Admin access check | `openid`, `isActive` |

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
