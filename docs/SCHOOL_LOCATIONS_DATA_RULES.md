# School locations data rules

Last updated: 2026-05-11

## Source of truth

`school_locations` is the source of truth for where a learning community operates.

Do **not** use `schools.city` as the filter/search source for newly entered data.

## Rules for new data

When manually processing a `school_submissions` recommendation:

1. Create or update the canonical community row in `schools`.
2. Put each actual operating city/location into `school_locations`.
3. Keep `schools.city` empty or use it only as a legacy/display fallback. Do not write comma-separated city strings into new `schools.city` rows.
4. If one learning community has multiple locations, write multiple `school_locations` rows with the same `school_id`.
5. Set `school_locations.status` explicitly.

Recommended `school_locations.status` values:

- `published`: visible to users.
- `draft`: not yet ready for public display.
- `archived`: no longer active; filtered out by public reads.

Recommended traceability fields:

- `source`: e.g. `seed`, `admin_manual`, `user_submission`.
- `source_submission_id`: the `_id` from `school_submissions` when the location came from user recommendation.

## Minimal schema expectation

```js
{
  school_id: Number,
  province: String,
  city: String,
  address_note: String,
  contact_note: String,
  status: 'published' | 'draft' | 'archived',
  source: String,
  source_submission_id: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Why this matters

Filtering by locations must remain stable as the dataset grows. If new data goes back into comma-separated `schools.city`, future migration will be noisy and error-prone. Keep the octopus in one tank, not across seven teacups.
