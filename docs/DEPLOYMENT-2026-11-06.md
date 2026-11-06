# Production rollout — 6 November 2026

PR #25 was merged as `9b5f2e2e3670a3a032a7c09dc17bae57a71da287`.
Cloudflare build `a6dab14e-5246-46ab-a380-0c118d7e3002` completed successfully
and deployed Worker version `86dad633-b61d-4f64-b697-e487745ff1b4` at 100%.

## Database sequence

- 20261106152638: backward-compatible lesson count RPC.
- 20261106152644: server-only Bunny ownership registry.
- 20261106152652: username setup and guards.
- 20261106153555: protected lesson catalog and restrictive content RLS,
  applied after the new application was serving.

Migration filenames match the actual production history. No customer tables
were deleted or emptied; customer table row counts were unchanged before and
after rollout. Payment and video provider credentials were preserved.

## Verification

- Home, courses and login return HTTP 200.
- The Mux route rejects the old arbitrary playbackId request with HTTP 400
  and does not issue a token.
- Public catalog content/media URL leak count is zero.
- The restrictive lesson-content policy exists.
- Authenticated course access, uploads and real/sandbox payments still require
  owner acceptance testing with appropriate accounts; no real charge was made.

## Recovery

Original source and affected schema definitions are preserved at commit
`e3ca9d7c6bc403712324755b8d5acf95dc1782fb` on
`backup/before-security-2026-11-06`.

ZIP: https://github.com/naeim179/edc_website/archive/e3ca9d7c6bc403712324755b8d5acf95dc1782fb.zip

Previous Worker version: `4e2e4f38-fd8b-4f51-bb64-c63d9dc7fb0d`.
The backup contains code and affected schema definitions, not a complete
customer-data or Storage-file export. Recovery must coordinate application and
RPC compatibility; see BACKUP-README.md in the backup branch. It must preserve
new activity and the new upload ownership records.

The proposed visual redesign is not part of this deployment.
