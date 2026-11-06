# Learning interface release

The approved interface uses a light study workspace, forest green accents, compact course cards, real student progress and a responsive lesson curriculum. Student and guest screens include quick navigation on mobile; administrator and teacher permission filtering remains in the existing sidebar.

## Previous version and rollback

- Previous source commit: `bb800a7c29c480c95789aac5beab53552cdf8860`.
- Preserved branch: `backup/before-frontend-2026-11-06`.
- Source ZIP: https://github.com/naeim179/edc_website/archive/bb800a7c29c480c95789aac5beab53552cdf8860.zip
- Previous production Cloudflare Worker version: `20771b6a-9795-4c75-b661-832b41785f93`.

For an immediate frontend rollback, deploy that Worker version at 100% in Cloudflare's deployment history. To restore the corresponding source, open a PR restoring the frontend files from the backup branch. Preserve the security and database fixes already present in this backup. This release does not change database schema or customer records; no database rollback is required.

## Validation scope

Use the repository's application checks (security tests, lint, typecheck, Next and Vinext production builds). Browser checks cover desktop/mobile home, catalog, login, course detail and a free preview lesson. An isolated local fixture preview also checks the student dashboard, English/LTR, dark and eye themes, the mobile drawer, administrator/teacher menus and locked curriculum links. Fixtures are outside the repository and are not deployed.

Existing ESLint image/font warnings remain. Authenticated checkout, payment and paid video playback require a real test account and are not covered by the public browser smoke checks.
