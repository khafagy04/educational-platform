# Wallet and payment threat model

Status: Phase 7 local implementation review complete; real Fawaterk sandbox verification pending.

## Assets and trust boundaries

Protected assets are wallet balances, payment/order state, enrollment access, Fawaterk credentials, webhook authenticity, and the immutable transaction trail. Browser redirects are untrusted and never activate value. The service initiates payment intent, the repository owns all durable and transactional transitions, and only a verified provider webhook may complete a Fawaterk top-up or direct purchase.

## Threats and controls

| Threat                                      | Control                                                                                                                                  | Verification                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Fake payment-success redirect               | Success, failure, and pending pages never change database state; only a verified webhook does                                            | Direct-payment test confirms no enrollment exists before the webhook                 |
| Forged webhook                              | HMAC-SHA256 is recomputed over Fawaterk's documented canonical invoice fields and compared with constant-time equality                   | Integration test rejects an invalid 64-character hash with 401                       |
| Webhook replay / double credit              | Unique `(provider, providerEventId)` inbox entry is created before effects; repeat delivery returns success without applying money twice | Top-up test submits the same paid event twice and confirms one credit                |
| Concurrent wallet overspend                 | Serializable transaction and conditional `balance >= amount` atomic decrement                                                            | Wallet test proves a larger purchase returns a clean 409 after prior deduction       |
| Partial wallet purchase                     | Deduction, paid Payment, ledger entry, paid Order, and Enrollment creation share one database transaction                                | Integration test observes the enrollment and updated wallet only after success       |
| Decimal rounding error                      | PostgreSQL/Prisma decimal values are retained end-to-end; API amounts are limited to two decimal places                                  | Validators and repository use fixed decimal strings rather than floating arithmetic  |
| Double purchase                             | Order creation and payment paths reject an active, non-expired enrollment for the same student/course                                    | Integration test rejects a second order after confirmed direct purchase              |
| Cross-account order payment                 | Every pay lookup includes both authenticated `userId` and order ID                                                                       | Repository ownership query                                                           |
| Provider failure after local intent         | Pending top-up/payment is marked failed when session creation fails; no balance or enrollment is changed                                 | Service compensation path                                                            |
| Unknown provider reference                  | Webhook processing fails without wallet/enrollment effects and records a generic failed inbox state                                      | Repository reference lookup and failure transition                                   |
| Credential or provider-reference disclosure | API token/vendor key remain environment-only; wallet history excludes provider references and webhook payloads                           | Wallet-history integration assertion                                                 |
| Expired access retained                     | Daily job marks elapsed active enrollments `EXPIRED`; Phase 6 rechecks status and timestamp for every playback grant                     | Cross-phase integration test expires an enrollment then receives 403 for video token |

## Residual risks and deployment gates

- Fawaterk's documented webhook signature covers canonical invoice ID/key/payment-method fields rather than the raw request body, so the adapter follows the provider-specific contract. The unique event inbox is the replay boundary because the documented paid webhook has no timestamp.
- A real sandbox must confirm field casing, invoice identifiers, webhook delivery/retry behavior, vendor-key selection, checkout URLs, and failure/expiry callbacks.
- The daily in-process expiry timer can run on multiple replicas; its update is idempotent. Phase 12 replaces it with one scheduled queue job.
- Refunds, disputes, chargebacks, and administrative wallet adjustments require explicit later policy before production sales.
- Operational reconciliation must compare provider settlements against Payments and WalletTransactions; webhook receipt alone is not an accounting close.

## Review checklist

- No redirect or client callback can mark funds paid.
- Webhook verification precedes persistence effects.
- Replayed provider events cannot credit twice.
- Wallet changes and enrollment activation are transactionally coupled.
- Insufficient funds cannot create a Payment or Enrollment.
- All student resource lookups are ownership-scoped.
- Real-provider evidence remains pending and is not represented as passed.
