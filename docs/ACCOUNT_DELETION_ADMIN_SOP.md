# Account deletion admin SOP

Last updated: 2026-05-11

Current launch scope: account deletion requests are handled through CloudBase console or an admin script. No mini-program admin UI is required for launch.

## Collection

```text
account_deletion_requests
```

Recommended permission posture:

```text
All users cannot read/write
Cloud functions read/write only
```

## User-facing behavior

When a user submits a deletion request:

1. A row is added to `account_deletion_requests` with `status = pending`.
2. Their public profile is immediately anonymized.
3. Their map visibility is turned off.
4. Public contact/channel fields are cleared.

## Daily admin check

During launch week, check pending requests at least once per day.

CloudBase console query:

```js
collection: account_deletion_requests
where: { status: 'pending' }
orderBy: createdAt DESC
limit: 50
```

## Manual handling steps

For each pending request:

1. Confirm the user row in `users` has already been anonymized and hidden from map.
2. Check whether the user has related operational records that should be retained for audit/safety reasons, such as reports or admin audit logs.
3. Decide final handling:
   - `completed`: request handled.
   - `needs_followup`: more identity/context verification needed.
   - `rejected`: only if there is a clear legal/abuse reason to retain the account state; document why.
4. Update the request row:

```js
{
  status: 'completed',
  handledAt: serverDate,
  handledBy: 'ADMIN_NAME',
  adminNote: 'Public profile anonymized and hidden; no further user-visible data remains in member directory.'
}
```

## Response SLA

Launch-week target:

```text
Handle pending account deletion requests within 7 days.
```

## Do not do this manually without a checklist

Do not hard-delete arbitrary related records from production without first checking whether they are needed for:

- abuse reports
- safety/audit logs
- financial/payment records
- legal retention
- operational debugging

Public visibility should be removed immediately; physical deletion/retention policy can be refined after launch.
