# CloudBase indexes and manual cleanup checklist

All business traffic goes through one cloud function:

```text
appService
```

The client calls `src/services/cloud.ts`, which sends an explicit `action` to `cloudfunctions/appService/index.js`.

## Current appService actions

```text
getOpenId
getFilterOptions
getSchools
getSchoolMarkers
getSchoolDetail
getEvents
getEventDetail
submitSchool
submitEvent
submitCorrection
getEventInterestCountsBatch
getEventInterestInfo
toggleEventInterest
getMyFavoriteEvents
getEventContactInfo
getMe
getProfileBootstrap
saveProfile
updatePrivacySettings
requestAccountDeletion
getSafetyOverview
getMapUsers
manageSafetyRelation
reportUser
checkAdminAccess
recordLegalConsent
getLegalConsentStatus
listEventSubmissions
getEventPublishPayload
publishEventDirect
reviewEventSubmission
```

Removed prelaunch actions. Do not keep these in CloudBase routing:

```text
submitCommunity
submitEventCorrection
getMyRequests
sendRequest
respondRequest
manageConnection
```

## Final launch collections

```text
users
safety_relations
user_reports
account_deletion_requests
legal_consents
rate_limits

schools
school_locations
school_submissions
school_corrections

events
event_submissions
event_corrections
event_interest
event_interest_counts

admin_users
admin_audit_logs
counters
```

Legacy collections to delete if they exist and contain no keeper data:

```text
connections
community_submissions
corrections
```

## Manual CloudBase cleanup

Do this separately in dev and prod.

1. Cloud Functions / 云函数: keep `appService`.
2. Delete old standalone functions if still deployed: `getOpenId`, `getEvents`, `getSchools`, `getEventDetail`, `getSchoolDetail`, `submitCorrection`, `submitEvent`, `submitCommunity`, `submitEventCorrection`, `getMe`, `saveProfile`, `updatePrivacySettings`, `getMapUsers`, `getMyRequests`, `sendRequest`, `respondRequest`, `manageConnection`, `getSafetyOverview`, `manageSafetyRelation`, `reportUser`.
3. Database / 数据库: delete old collections if present and disposable: `connections`, `community_submissions`, `corrections`.
4. Database / 数据库: confirm `counters/events` exists with `current = max(events.id)` in any environment that already has canonical events.
5. For all collections below, set permission to: 所有用户不可读写 / 仅云函数可读写.

## Event id counter seed

`publishEventDirect` allocates canonical event ids through `counters/events.current`.

If an environment already has records in `events`, manually seed or confirm this document before launch:

```text
collection: counters
doc id: events
name: events
current: max(existing events.id)
```

If the max existing `events.id` is `70`, set `current` to `70`, not `71`. The publish flow increments first, then uses the incremented value as the next id.

No extra index is required for `counters`; the code reads and updates by document id.

## Index creation notes

Create indexes separately in dev and prod. Field order matters. Use ascending unless a field says descending.

## Priority A indexes

### schools

```text
idx_schools_status_id: status asc, id asc
idx_schools_id_status: id asc, status asc
idx_schools_status_school_type_id: status asc, school_type asc, id asc
idx_schools_status_age_range_id: status asc, age_range asc, id asc
```

### school_locations

```text
idx_school_locations_school_id_status: school_id asc, status asc
idx_school_locations_province_status: province asc, status asc
idx_school_locations_province_city_status: province asc, city asc, status asc
```

### events

```text
idx_events_status_start_time: status asc, start_time asc
idx_events_id_status: id asc, status asc
```

### users

```text
idx_users_openid: openid asc
idx_users_visible_province_city_displayName: isVisibleOnMap asc, province asc, city asc, displayName asc
idx_users_province_visible_city_displayName: province asc, isVisibleOnMap asc, city asc, displayName asc
```

### school_submissions

```text
idx_school_submissions_status_createdAt: status asc, createdAt desc
idx_school_submissions_normalizedKey_status: normalizedKey asc, status asc
idx_school_submissions_openid_createdAt: openid asc, createdAt desc
```

### event_submissions

```text
idx_event_submissions_status_createdAt: status asc, createdAt desc
idx_event_submissions_normalizedKey_status: normalizedKey asc, status asc
idx_event_submissions_openid_createdAt: openid asc, createdAt desc
idx_event_submissions_publishedEventId_status: publishedEventId asc, status asc
```

### school_corrections

```text
idx_school_corrections_status_createdAt: status asc, createdAt desc
idx_school_corrections_targetId_createdAt: targetId asc, createdAt desc
idx_school_corrections_schoolId_createdAt: schoolId asc, createdAt desc
```

### event_corrections

```text
idx_event_corrections_status_createdAt: status asc, createdAt desc
idx_event_corrections_targetId_createdAt: targetId asc, createdAt desc
idx_event_corrections_eventId_createdAt: eventId asc, createdAt desc
```

### rate_limits

```text
idx_rate_limits_updatedAt: updatedAt asc
```

### legal_consents

```text
idx_legal_consents_openid_createdAt: openid asc, createdAt desc
```

### admin_users

```text
idx_admin_users_openid_isActive: openid asc, isActive asc
```

### admin_audit_logs

```text
idx_admin_audit_logs_adminOpenid_createdAt: adminOpenid asc, createdAt desc
idx_admin_audit_logs_targetType_targetId_createdAt: targetType asc, targetId asc, createdAt desc
idx_admin_audit_logs_action_createdAt: action asc, createdAt desc
```

## Priority B indexes

### safety_relations

```text
idx_safety_relations_owner_updatedAt: ownerOpenid asc, updatedAt desc
idx_safety_relations_owner_target: ownerOpenid asc, targetOpenid asc
idx_safety_relations_target_isBlocked: targetOpenid asc, isBlocked asc
```

### event_interest

```text
idx_event_interest_eventId_status: eventId asc, status asc
idx_event_interest_eventId_openid_status: eventId asc, openid asc, status asc
idx_event_interest_openid_status_updatedAt: openid asc, status asc, updatedAt desc
```

### event_interest_counts

```text
idx_event_interest_counts_eventId: eventId asc
```

### user_reports

```text
idx_user_reports_reporter_target_createdAt: reporterOpenid asc, targetOpenid asc, createdAt desc
```

### account_deletion_requests

```text
idx_account_deletion_requests_status_createdAt: status asc, createdAt desc
idx_account_deletion_requests_openid_createdAt: openid asc, createdAt desc
```

## Copy checklist

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
[ ] users: isVisibleOnMap + province + city + displayName
[ ] users: province + isVisibleOnMap + city + displayName

[ ] school_submissions: status + createdAt(desc)
[ ] school_submissions: normalizedKey + status
[ ] school_submissions: openid + createdAt(desc)

[ ] event_submissions: status + createdAt(desc)
[ ] event_submissions: normalizedKey + status
[ ] event_submissions: openid + createdAt(desc)
[ ] event_submissions: publishedEventId + status

[ ] school_corrections: status + createdAt(desc)
[ ] school_corrections: targetId + createdAt(desc)
[ ] school_corrections: schoolId + createdAt(desc)

[ ] event_corrections: status + createdAt(desc)
[ ] event_corrections: targetId + createdAt(desc)
[ ] event_corrections: eventId + createdAt(desc)

[ ] rate_limits: updatedAt
[ ] legal_consents: openid + createdAt(desc)
[ ] admin_users: openid + isActive

[ ] admin_audit_logs: adminOpenid + createdAt(desc)
[ ] admin_audit_logs: targetType + targetId + createdAt(desc)
[ ] admin_audit_logs: action + createdAt(desc)

[ ] safety_relations: ownerOpenid + updatedAt(desc)
[ ] safety_relations: ownerOpenid + targetOpenid
[ ] safety_relations: targetOpenid + isBlocked

[ ] event_interest: eventId + status
[ ] event_interest: eventId + openid + status
[ ] event_interest: openid + status + updatedAt(desc)
[ ] event_interest_counts: eventId

[ ] user_reports: reporterOpenid + targetOpenid + createdAt(desc)
[ ] account_deletion_requests: status + createdAt(desc)
[ ] account_deletion_requests: openid + createdAt(desc)

[ ] counters/events: current = max(events.id), no index needed
```

## Permission recommendation

Apply to all launch collections:

```text
所有用户不可读写
仅云函数可读写
```

The client should only read/write through `appService`. Do not allow direct client writes to users, submissions, corrections, reports, legal consent, safety, admin, rate-limit, or counters collections.

## Data hygiene notes

- `school_locations` is the source of truth for learning-community display/filter/map locations.
- New `schools`, `school_locations`, and `events` documents should explicitly set `status: 'published'` or a similar non-deleted value.
- Public reads hide deleted-like statuses: `deleted`, `removed`, `archived`.
- Do not append comma-separated cities to `schools.city` for new data.
- Keep `schools.name` for compatibility, but prefer `schools.canonical_name` in new reads/admin workflows.
- Map marker label style objects are WeChat Map API marker-label config, not normal design-system UI.
- The `event_interest` collection still stores `status: 'interested'` for compatibility, but launch UI labels this user action as “收藏”.

## Intentionally removed from launch

No in-app person-to-person request flow in the launch build:

```text
connections
getMyRequests
sendRequest
respondRequest
manageConnection
```

Member discovery is a one-way public directory plus safety controls: `getMapUsers`, `manageSafetyRelation`, `reportUser`.
