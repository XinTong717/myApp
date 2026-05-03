# CloudBase checklist: account_deletion_requests

`account_deletion_requests` stores account deletion / personal-information deletion requests created by `requestAccountDeletion`.

Create this collection separately in **dev** and **prod** before public testing.

## Collection permission

Use the same app-managed collection rule as the rest of the product data:

```text
所有用户不可读写
仅云函数可读写
```

Do not allow client-side direct read or write access.

## Required indexes

### `idx_account_deletion_requests_openid_createdAt`

```text
openid: ascending
createdAt: descending
```

Used to review a user's deletion-request history and diagnose repeated deletion attempts.

### `idx_account_deletion_requests_status_createdAt`

```text
status: ascending
createdAt: descending
```

Used by future admin review queues and manual processing lists.

## Copy checklist

```text
[ ] account_deletion_requests: permission = 仅云函数可读写
[ ] account_deletion_requests: openid + createdAt(desc)
[ ] account_deletion_requests: status + createdAt(desc)
```

## Data hygiene notes

Expected document fields include:

```text
openid
userDocId
displayName
city
note
status
createdAt
updatedAt
```

The current user profile is immediately anonymized and hidden from the public map when the request is submitted. The request document itself remains for audit and manual follow-up.
