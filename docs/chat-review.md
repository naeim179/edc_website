# Chat audit and repairs

The chat inbox kept the original text after a message was edited or deleted. The database only maintained previews on insertion, the client preserved stale values when a preview became null, and some Realtime subscriptions joined before the browser session was bound.

## Resulting behavior

- Edits, soft deletion, hard deletion and read receipts recompute the preview and unread counters. Deleted messages display a tombstone; empty conversations reset their preview and timestamp.
- Realtime joins use the signed-in session. Typing channels are private and restricted to participants; admins can observe without sending.
- Thread and inbox data resynchronize after reconnect/focus. Late responses cannot overwrite a newer message snapshot.
- A missing, foreign or already-deleted message produces an error instead of false success. Identity fields and read receipts cannot be rewritten through direct client updates.
- Private attachments store stable paths. Both new paths and legacy signed links are resolved to fresh, authorized URLs. Deleted links are hidden; future attachment deletion also removes the sender-owned upload. A storage outage leaves text messages readable.
- Sending is guarded against repeated clicks; failed sends retain the draft and selected attachment. Failed message creation removes the newly uploaded orphan.
- Edit/delete controls support touch and keyboard interaction, long content wraps, and the sender bubble uses the theme's foreground token. Admin threads have no composer or mutation controls.
- Concurrent conversation creation reuses one conversation and validates the student's enrollment and assigned instructor.

## Verification

- Full migration chain and chat/security SQL regressions on disposable PostgreSQL 17.
- Application tests for attachment origin/path/type/size checks, signing/redaction, failed mutation handling, cache invalidation and authenticated/cancelled Realtime joins.
- Isolated live accounts: student, teacher, admin and an unenrolled outsider. No existing conversation was used for message tests.
- Browser coverage: participant/admin inbox updates; editing, cancellation, deletion and navigating out; delivery/read receipts; duplicate submit; multiline composition; failed-send draft retention; image upload/remove/reselect; file limits; legacy expired attachments; reconnect; long content; mobile light/dark/eye modes and English layout.

## Deployment and data preservation

The three chat migrations are versioned to match the connected Supabase migration history. They preserve all existing message rows and stored objects. Only derived conversation summaries/counters are rebuilt; future user-requested deletion sanitizes that message. Temporary audit accounts, course, conversation and uploads are removed after verification.
