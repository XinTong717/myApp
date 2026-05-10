# CloudBase launch schema reference

This document is the launch-time source of truth for CloudBase collections. The app should access these collections through `appService`; direct client read/write permissions should stay disabled.

## Collection groups

### User / privacy / safety

| Collection | Purpose | Written by | Read by | Personal data | Notes |
| --- | --- | --- | --- | --- | --- |
| `users` | User profile, public-directory visibility, expanded public profile fields | `saveProfile`, `updatePrivacySettings`, `requestAccountDeletion` | `getMe`, `getProfileBootstrap`, `getMapUsers`, admin flows | High | `_id` should be the user openid. Public fields include display name, city, roles, bio, companion context. Expanded fields include `publicChannel`, `publicChannelNote`, parent/educator details. |
| `safety_relations` | Block/mute relationships | `manageSafetyRelation` | `getSafetyOverview`, `getMapUsers` | Medium | Used to hide users from each other in map/directory flows. |
| `user_reports` | User reports | `reportUser` | future admin moderation | High | Contains reporter/target openids and free-text notes. |
| `account_deletion_requests` | Account deletion/data removal requests | `requestAccountDeletion` | future admin operations | High | Profile is immediately hidden/anonymized before full manual processing. |
| `legal_consents` | User agreement/privacy-policy consent audit | `recordLegalConsent` | `getLegalConsentStatus`, consent gate | High | Store version fields and timestamps for auditability. |
| `rate_limits` | Per-user/action rate limit records | `rateLimit` middleware | `rateLimit` middleware | Medium | Stable document id is `openid_action`. |

### Learning communities

| Collection | Purpose | Written by | Read by | Personal data | Notes |
| --- | --- | --- | --- | --- | --- |
| `schools` | Canonical learning-community content | admin/import/manual seed | `getSchools`, `getSchoolMarkers`, `getSchoolDetail` | Low | Use `status: 'published'` for visible records. Prefer `canonical_name`; keep `name` for compatibility. |
| `school_locations` | Source of truth for school locations | admin/import/manual seed | school list/detail/map flows | Low | Do not append comma-separated city lists into `schools.city` for new data. |
| `school_submissions` | User-submitted school recommendations | `submitSchool` | future admin review | Medium | Contains submitter openid/profile snapshot and free text. |
| `school_corrections` | User-submitted school corrections | `submitCorrection` with `targetType: 'school'` | future admin review | Medium | Store both generic fields (`targetId`, `targetTitle`) and compatibility fields (`schoolId`, `schoolName`). |

### Events

| Collection | Purpose | Written by | Read by | Personal data | Notes |
| --- | --- | --- | --- | --- | --- |
| `events` | Canonical event content | admin/import/manual seed | `getEvents`, `getEventDetail` | Low/Medium | Public signup info is public. Private organizer contact should be gated through `getEventContactInfo`. |
| `event_submissions` | User-submitted event recommendations | `submitEvent` | `listEventSubmissions`, admin review/publish | High | May contain organizer private contact. Keep direct client access disabled. |
| `event_corrections` | User-submitted event corrections | `submitCorrection` with `targetType: 'event'` | future admin review | Medium | Store both generic fields (`targetId`, `targetTitle`) and compatibility fields (`eventId`, `eventTitle`). |
| `event_interest` | Per-user event interest state | `toggleEventInterest` | `getEventInterestInfo` | Medium | Stable doc id is `event_${eventId}_${openid}`. |
| `event_interest_counts` | Materialized event interest counts | `toggleEventInterest` | `getEvents`, `getEventInterestInfo`, batch count action | Low | `_id` should be the event id string. |

### Admin

| Collection | Purpose | Written by | Read by | Personal data | Notes |
| --- | --- | --- | --- | --- | --- |
| `admin_users` | Admin access allowlist | manual/admin setup | `checkAdminAccess`, admin actions | Medium | Use `isActive` to disable access without deleting audit context. |
| `admin_audit_logs` | Admin action history | admin actions | admin review/debugging | Medium | Use target fields for traceability. |

## Removed / legacy collections

These should not be used in the launch build. Delete them from CloudBase if they exist and contain no keeper data.

```text
connections
community_submissions
corrections
```

## Removed action contracts

Do not re-add these unless the product intentionally reintroduces in-app matching/request flows.

```text
getMyRequests
sendRequest
respondRequest
manageConnection
submitCommunity
submitEventCorrection
```

Current member discovery is a one-way directory with explicit visibility and safety controls:

```text
getMapUsers
updatePrivacySettings
manageSafetyRelation
reportUser
```

## Permission baseline

For launch, set all app-managed collections to:

```text
所有用户不可读写
仅云函数可读写
```

The miniprogram client should call `appService` actions only. This is especially important for:

```text
users
school_submissions
school_corrections
event_submissions
event_corrections
user_reports
account_deletion_requests
legal_consents
admin_users
admin_audit_logs
rate_limits
```

## Status and deletion semantics

Public content collections should use explicit status values.

Recommended visible status:

```text
published
```

Deleted-like statuses hidden from public reads:

```text
deleted
removed
archived
```

Avoid relying on missing `status` for new content. Missing status may still be tolerated by current compatibility code, but new data should be explicit.

## Public profile field contract

The launch profile schema uses these names:

```text
expandedProfileVisible
publicChannel
publicChannelNote
```

Do not use the old names:

```text
allowIncomingRequests
contactId
contactNote
wechatId
```

Users can still enter a personal WeChat ID under `publicChannel`; the schema should not treat WeChat as a special field.

## Correction action contract

Both school and event corrections use one action:

```ts
submitCorrection({
  targetType: 'school' | 'event',
  targetId: number,
  targetTitle: string,
  content: string,
})
```

Storage collections remain separate:

```text
school_corrections
event_corrections
```

## CloudBase console launch checklist

```text
[ ] Dev: legacy functions removed; appService kept
[ ] Prod: legacy functions removed; appService kept
[ ] Dev: legacy collections removed if disposable
[ ] Prod: legacy collections removed if disposable
[ ] Dev: all launch collections use cloud-function-only permissions
[ ] Prod: all launch collections use cloud-function-only permissions
[ ] Dev: Priority A indexes created
[ ] Prod: Priority A indexes created
[ ] Dev: Priority B indexes created or intentionally deferred
[ ] Prod: Priority B indexes created or intentionally deferred
```
