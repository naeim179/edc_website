# Connected environment review — 6 November 2026

Scope: read-only inspection of GitHub `naeim179/edc_website`, Supabase project
`educational-platform` and the two Cloudflare Workers. No production SQL,
customer records, payments, secrets or deployed code were modified in this audit.

## Verified

- GitHub main matches base commit `6de959e7f46e69878359a23a40f2a8308a14fc1d`.
- Supabase is active/healthy; all 25 public application tables have RLS enabled.
- Cloudflare application responds with HTTP 200. The app and renewal Worker
  exist; `MAIN_APP` targets `educational-platform`; schedules are hourly renewal
  and five-minute reconciliation. Supabase URL and KV binding match the repo.
- Required secret binding names are present. Secret **values were not read**;
  presence alone does not prove that external Mux/Bunny/PayTabs credentials work.
- The queried Supabase error-log summary returned no rows for ERROR/FATAL/CRITICAL
  in the tool's default last-24-hour window. This is bounded evidence, not a
  guarantee of error-free operation.

## Production differences accounted for in this branch

- Username column/functions and extra profile protections already exist remotely,
  but their username setup was absent from source migrations. No existing
  username is invalid/reserved or duplicated case-insensitively in the checks.
  The username repair preserves existing values and reuses an existing covering
  unique username index instead of adding a redundant one.
- Migration `20261031100000_chat_admin_read_only` exists remotely but was missing
  from GitHub. Its exact stored statements were restored to source. It must not
  be reapplied on that project. New installations now retain the same chat policy.
- Production lesson RLS is already stricter than the historical source baseline.
  The additional restrictive guard preserves authorization even when old permissive
  policies exist. The public curriculum RPC still exposes media IDs and content
  URLs; the proposed migration fixes that alongside the application changes.

## Outstanding operational and performance items

- Supabase reports leaked-password protection disabled. Enable it in the project's
  Auth password/security settings if supported by the account plan, then test
  signup and password changes. No connector configuration tool was available to
  toggle that setting during this audit.
  [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Advisor warnings about SECURITY DEFINER RPCs need interpretation: public metadata
  and access-check functions are intentionally callable; trigger-only functions
  cannot be invoked as normal RPCs. Do not blindly revoke functions used by RLS.
  Internal payment tables have RLS and no user policies intentionally: they are
  server-only. [Function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- Performance advisors suggest 16 missing foreign-key indexes, 26 RLS initplan
  improvements, 20 overlapping policy findings and one duplicate-index finding.
  These counts describe findings, not demonstrated runtime failures. Review query
  plans and table sizes on staging before altering live indexes or policies.
  No live indexes were dropped and no blanket policy rewrite was performed.
  [Index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
  [RLS guidance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
- Stage the code and database rollout together following HANDOVER.md. Paid lessons,
  preview playback, teacher uploads, profile storage and sandbox payment flows must
  be checked with real staging accounts before merging/deploying production.
- A separate visual design preview is intentionally outside the security branch
  and must be reviewed by the owner before it is uploaded or published.
