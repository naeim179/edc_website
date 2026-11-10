# Payment review — 7 November 2026

## Repairs

- Discount reservations and free-subscription coupon redemption both had an unqualified `coupon_id` predicate conflicting with their PL/pgSQL output parameter. Reproduced against PostgreSQL 17, repaired both functions without changing existing records or access grants, and verified both against the deployed database inside a rolled-back transaction.
- PayTabs creation, transaction queries and recurring requests now time out after 15 seconds. Uncertain creation/renewal outcomes retain the existing pending/review behavior to prevent another charge.
- Fulfillment requires the provider query to identify the exact requested transaction. Malformed webhook references are rejected before querying PayTabs. Callback verification fails closed if its signing secret is missing.
- A recurring decline must match the renewal order, amount, currency and transaction reference before closing the order or recording a renewal failure.
- Confirmed-cancellation UI now reads the signed-in owner's closed order. Editing return-page query parameters cannot fabricate a verified cancellation. Signed cancellations carry the closed order ID through the return redirect.

- The mobile checkout grid could exceed a 390px viewport. Its columns and cards now shrink within the available width.

## Validation

- Payment handler regressions run real TypeScript modules with mocked provider/database boundaries: approval, refusal/cancellation/pending/hold/error, foreign owner, invalid amount/cart/reference, webhook HMAC tampering, malformed callbacks, retry on database failure, cron authorization, uncertain recurring outcomes, and forged/verified cancellation pages.
- Disposable PostgreSQL 17 applies every migration, then checks immutable checkout snapshots, duplicate initialization, amount/currency mismatches, duplicate approval and extra transactions, calendar-month renewals, premature/expired closure, CliQ approval idempotency, pending-renewal exclusion, coupon redemption, free-coupon reuse rejection, and atomic private booking/enrollment.
- Production browser: separate temporary student; hosted PayTabs visibly marked **Test mode**; successful payment using PayTabs' documented non-3DS test card returned to confirmed activation. Database showed one paid order, one enrollment and one active monthly subscription. No real card or real funds used.
- Scheduler configuration verified: reconciliation every five minutes, automatic renewal hourly. Existing renewal tokens were not charged.
- TypeScript, lint (only 10 existing image warnings), application regressions and vinext production build passed locally. CI runs both Next and vinext builds and PostgreSQL tests.

## Operational limits

Sandbox behavior does not certify bank settlement, refunds, live credentials or live 3DS. Existing ambiguous historical payments were left untouched. Financial review tables and payment tokens remain inaccessible to browser roles. Existing Supabase advisor warnings about intentional public helper functions and Auth password protection are outside these payment repairs.

Official test-card reference: https://support.paytabs.com/en/support/solutions/articles/60000712315-what-are-the-test-cards-available-to-perform-payments-

## Browser Back and automatic checkout recovery

Returning from the hosted card page now checks only the authenticated owner's course/order. An HttpOnly, checkout-scoped cookie remembers the handed-off order so a paid browser-history entry returns to the course instead of initiating a second subscription. Hints remain untrusted: every lookup includes both owner and course. A payment that settles between reads is checked again before authorizing a retry.

While a card attempt remains unresolved, the selected payment method can be queued on the current checkout page. The visible page rechecks every 30 seconds and continues once the existing verified unpaid closure succeeds. Changing the method, duration, coupon, amount or private reservation discards the queued intent. Restoring a page from the browser cache resets stale transitions; a new tab or reload does not restore automatic purchase consent. Provider lookup failures keep the order and queued intent protected. Recent verification timestamps limit redundant provider calls across tabs.

This does not treat Back, tab closure or client messages as proof of cancellation. PayTabs HPP does not offer a merchant API to cancel an active page before payment. The financial guards remain unchanged: a five-minute HPP lifetime and a 15-minute expiry/3DS margin for no-transaction recovery, including the known-approved canary; pending/hold/unknown results and review cases never release the checkout. The page explains the possible wait. Private reservations released during closure require fresh schedule selection. Existing manual CliQ requests/proofs remain protected.

Validation covers ownership, malicious hints, cookie policy, callback/read races, approved and unpaid results, review cases, shared verification, and private rescheduling. Browser tests render the real checkout/button/hook with simulated provider boundaries to verify one queued continuation, changing/cancelling intent, network loss, paid navigation, and browser-cache restoration.

Provider references: [integration capabilities](https://docs.paytabs.com/manuals/PT-API-Endpoints/Integration-Types-Manuals/-Landing-Page/) and [hosted-page expiry](https://docs.paytabs.com/manuals/PT-API-Endpoints/Integration-Types-Manuals/Request-Response-Parameters/Request-Parameter-Page-session-expiry/).
