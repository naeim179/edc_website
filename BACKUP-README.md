# Backup before security rollout

Original main commit: `6de959e7f46e69878359a23a40f2a8308a14fc1d`.

This branch preserves the original application source and lockfile. Download its ZIP before making further changes. The `.backup` directory contains definitions of the functions/policies/constraints affected by the rollout, with no customer rows, passwords, API keys or payment tokens.

Previous Cloudflare Worker version: `4e2e4f38-fd8b-4f51-bb64-c63d9dc7fb0d` (deployment `7d82e329-5ed6-4d2f-a22f-58f95db73a65`). Cloudflare version retention is separate from this durable source backup; if the version expires, rebuild from the saved source and existing service configuration.

A code rollback must be coordinated with database function compatibility. `.backup/restore-previous-functions.sql` restores the previous RPC definitions without deleting customer records or the new upload ownership table. It restores the earlier security behavior too, so it is for recovery, not a recommended permanent configuration. Review migration history before applying future migrations.

This is a source/schema backup, not a full database or Storage-file backup. New user activity after rollout is not undone by restoring source code.
