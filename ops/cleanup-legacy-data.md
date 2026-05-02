# Legacy data cleanup plan

This project still keeps several compatibility fallbacks for historical CloudBase documents. These branches should not be removed until production data has been migrated and observed.

## Current legacy surfaces

### `users`

Canonical shape:

```text
collection: users
_id: <openid>
openid: <openid>
```

Compatibility path:

- `cloudfunctions/appService/lib/userRepo.js` first reads `users.doc(openid)`.
- If that misses, it falls back to `where({ openid }).limit(1)`.

Cleanup target:

- Every `users` document should have `_id === openid`.
- Remove `resolveUserDocId` fallback after prod/dev both show zero legacy hits.

### `event_interest`

Canonical shape:

```text
collection: event_interest
_id: event_<eventId>_<openid>
eventId: number
openid: string
status: interested | cancelled
```

Compatibility path:

- `getEventInterestInfo` and `toggleEventInterest` first read the stable doc id.
- If missing, they query by `{ eventId, openid }` and normalize the legacy rows.

Cleanup target:

- Every interest row should use the stable `_id` format.
- Duplicate legacy rows should be merged into the canonical row.
- Remove fallback queries and compatibility indexes only after observation.

### `safety_relations`

Canonical shape:

```text
collection: safety_relations
_id: safety_<ownerOpenid>_<targetOpenid>
ownerOpenid: string
targetOpenid: string
```

Compatibility path:

- `manageSafetyRelation` first reads the stable doc id.
- If missing, it queries by owner/target pair and removes duplicate legacy docs after writing the canonical doc.

Cleanup target:

- Every safety relation should use the stable `_id` format.
- Duplicate legacy rows should be removed after canonical write.

### Deprecated user contact field

`wechatId` is kept as a read fallback in request/contact display paths. New writes should use `contactId` only.

Cleanup target:

- Backfill `contactId` from `wechatId` where `contactId` is empty.
- Remove `wechatId` read fallback after all active docs are backfilled.

## Safe cleanup sequence

1. Add temporary admin-only counters for legacy rows in dev and prod.
2. Export a timestamped backup of affected collections.
3. Run migration in dev first.
4. Validate counts and spot-check representative users/events/safety relations.
5. Run migration in prod during a low-traffic window.
6. Keep runtime fallback branches for 7-14 days while logging any fallback hit.
7. If fallback hits stay at zero, remove fallback code and compatibility indexes.
8. Keep the migration backup until at least one full release cycle has passed.

## Do not remove yet

Do not immediately delete these runtime fallbacks from production code:

- `getUserProfileByOpenid` legacy `where({ openid })` lookup.
- `resolveUserDocId` legacy lookup.
- `event_interest` pair-query fallback.
- `safety_relations` pair-query fallback.
- `wechatId` display fallback.

They are historical debt, but they are also a parachute. Cut them only after the migration has landed.

## Post-cleanup validation checklist

- Profile load/save works for existing users and new users.
- Privacy toggles update the correct `users.doc(openid)` document.
- Map users still display current profiles.
- Event interest toggle does not duplicate rows.
- Event interest count reconciliation matches source rows.
- Block/mute/unblock/unmute creates at most one row per owner/target pair.
- Accepted connection contact display reads `contactId` correctly.
