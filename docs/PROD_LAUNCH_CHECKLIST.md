# 可雀小程序 Prod Launch Checklist

Last updated: 2026-05-11
Target env: `keque-prod-v2-d8gfsxh8j16fba620`

This checklist covers the production state that is **not fully represented in Git**. Do not treat a passing local build as proof that prod is ready.

## 0. Launch rule

Before submitting the mini-program for review or sharing the production build, verify all items below in the CloudBase console, WeChat DevTools, and on a real device.

Use this notation while checking:

```text
[ ] not checked
[x] checked and passed
[!] checked but needs action
```

## 1. Code and deployment

- [ ] `main` is pulled locally and points at the intended release commit.
- [ ] `npm run build:weapp:prod:check` passes locally.
- [ ] WeChat DevTools is using prod upload mode, not the dev CloudBase env.
- [ ] `appService` has been uploaded and deployed to prod with **cloud install dependencies**.
- [ ] The deployed `appService` version corresponds to the intended release commit.
- [ ] No stale standalone functions are still being called by frontend code.

## 2. OpenAPI and content security

- [ ] `cloudfunctions/appService/config.json` includes `security.msgSecCheck`.
- [ ] The prod deployed `appService` has OpenAPI permission for `security.msgSecCheck` in CloudBase console.
- [ ] `submitEvent` with normal text succeeds or enters pending review.
- [ ] `submitSchool` with normal text succeeds or enters pending review.
- [ ] A known risky test string is blocked or marked for review according to expected msgSecCheck behavior.
- [ ] `contentSecurityStatus = check_failed` is visible to admins and treated as manual-review-needed.

## 3. Collection permissions

Production collections should use this posture unless a specific exception is documented:

```text
All users cannot read and write
Cloud functions read/write only
```

Verify permissions for:

- [ ] `users`
- [ ] `legal_consents`
- [ ] `schools`
- [ ] `school_locations`
- [ ] `events`
- [ ] `event_submissions`
- [ ] `school_submissions`
- [ ] `school_corrections`
- [ ] `event_corrections`
- [ ] `event_interest`
- [ ] `event_interest_counts`
- [ ] `admin_users`
- [ ] `admin_audit_logs`
- [ ] `safety_relations`
- [ ] `user_reports`
- [ ] `rate_limits`
- [ ] `counters`
- [ ] `account_deletion_requests`

## 4. Required collection existence and seed data

- [ ] `users` exists.
- [ ] `legal_consents` exists.
- [ ] `schools` exists and contains initial published learning-community data.
- [ ] `school_locations` exists and contains location rows for published communities.
- [ ] `events` exists and contains initial published event data or is intentionally empty.
- [ ] `event_submissions` exists.
- [ ] `school_submissions` exists.
- [ ] `school_corrections` exists.
- [ ] `event_corrections` exists.
- [ ] `event_interest` exists.
- [ ] `event_interest_counts` exists.
- [ ] `admin_users` exists and includes the production openid for each active admin.
- [ ] `admin_audit_logs` exists.
- [ ] `safety_relations` exists.
- [ ] `user_reports` exists.
- [ ] `rate_limits` exists.
- [ ] `counters` exists or first publish can create/seed `counters/events` successfully.
- [ ] `account_deletion_requests` exists.

## 5. Required indexes

Verify indexes in prod, not only in docs.

### `users`

- [ ] `openid ASC`
- [ ] `isVisibleOnMap ASC, province ASC, city ASC, displayName ASC`
- [ ] `province ASC, isVisibleOnMap ASC, city ASC, displayName ASC`

### `events`

- [ ] `id DESC`
- [ ] `id ASC`
- [ ] `source_submission_id ASC`
- [ ] `status ASC, start_time ASC`
- [ ] `id ASC, status ASC`

### `event_submissions`

- [ ] `status ASC, createdAt DESC`
- [ ] `normalizedKey ASC, status ASC`
- [ ] `openid ASC, createdAt DESC`
- [ ] `publishedEventId ASC, status ASC`

### `school_submissions`

- [ ] `status ASC, createdAt DESC`
- [ ] `normalizedKey ASC, status ASC`
- [ ] `openid ASC, createdAt DESC`

### `safety_relations`

- [ ] `ownerOpenid ASC`
- [ ] `targetOpenid ASC, isBlocked ASC`
- [ ] `ownerOpenid ASC, targetOpenid ASC`

### `legal_consents`

- [ ] `_id / openid document lookup works for current user`.

### `rate_limits`

- [ ] `_id document lookup/update works for normal actions`.

### `counters`

- [ ] `_id = events` lookup/update works, or first event publish seeds it.

## 6. Admin access

- [ ] Production admin openid is known and recorded in `admin_users`.
- [ ] `checkAdminAccess` returns `ok: true` and `isAdmin: true` on a real device.
- [ ] Admin entry appears in the Profile tab for active admins.
- [ ] Event review page loads pending submissions.
- [ ] School submission review page loads pending recommendations.
- [ ] Admin actions write to `admin_audit_logs`.

## 7. Event publishing smoke test

Run in prod only with a disposable test submission or a real pending item that is ready to publish.

- [ ] User submits event successfully.
- [ ] Admin sees it in `event_submissions` pending list.
- [ ] Admin opens publish payload and reviews warnings.
- [ ] `publishEventDirect` writes a row to `events`.
- [ ] `event_submissions.status` becomes `merged`.
- [ ] `publishedEventId` is written back.
- [ ] Event list cache is cleared on frontend success.
- [ ] Newly published event appears in the Activity tab.
- [ ] `counters/events.current` increments as expected.

## 8. School submission smoke test

Current launch scope: manual review/processing, not automatic write to `schools + school_locations`.

- [ ] User submits a learning-community recommendation successfully.
- [ ] Admin sees it in the school submission review page.
- [ ] Admin can copy the structured submission text for manual data entry.
- [ ] Admin can mark the submission as processed after manual handling.
- [ ] Admin can reject or mark duplicate submissions.
- [ ] Updated status is reflected after refresh.
- [ ] Admin action writes to `admin_audit_logs`.

## 9. Privacy and safety smoke test

Use at least two real WeChat accounts.

- [ ] User A completes profile and chooses to appear on map.
- [ ] User B without completed profile cannot see A's expanded public fields.
- [ ] User B after completing profile can see A's expanded fields if A allows it.
- [ ] If A turns off expanded profile visibility, B cannot see A's public channel / expanded fields.
- [ ] If A turns off map visibility, A disappears from member directory.
- [ ] If A blocks B, A no longer sees B and B no longer sees A in member discovery.
- [ ] Report user flow writes a pending report.
- [ ] Account deletion request anonymizes public profile and hides from map.

## 10. Product boundary checks

Current positioning:

```text
可雀当前不是社交私信产品，而是成年人自愿公开资料的教育探索成员目录。平台不做站内私信、不做好友申请、不做自动撮合；用户只能查看对方选择公开的渠道，并自行谨慎联系。
```

Verify:

- [ ] No UI says “申请联系”.
- [ ] No UI says “好友申请”.
- [ ] No UI promises matching, private messaging, or in-app connection requests.
- [ ] User agreement says no private messaging / friend requests / in-app matching.
- [ ] Privacy policy says public channels are user-controlled public information.

## 11. Final pre-submit commands

```bash
git pull --rebase origin main
npm install
npm run build:weapp:prod:check
```

Then upload with WeChat DevTools using prod env:

```bash
npm run build:weapp:prod
```

Record the release commit and upload notes here:

```text
Release commit:
WeChat upload version:
CloudBase prod function deploy time:
Checker:
Notes:
```
