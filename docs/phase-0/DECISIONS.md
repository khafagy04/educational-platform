# Product Decisions

## Accepted defaults

| Area           | Decision                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Repository     | npm workspaces monorepo with `frontend/` and `backend/`                                                                               |
| Runtime        | Node.js 24 in development and containers                                                                                              |
| Locale         | Arabic-first, RTL, `Africa/Cairo`, Arabic UI copy; architecture remains translation-ready                                             |
| Currency       | EGP only; amounts use database decimal values and are serialized as strings at API boundaries                                         |
| Authentication | Short-lived access token; rotated refresh token in a secure, HTTP-only cookie; only a hash of each refresh token is stored            |
| CSRF           | SameSite cookie policy plus explicit origin checks; state-changing cookie-authenticated routes receive CSRF protection                |
| Enrollment     | One active entitlement per student and course; repurchase after expiry creates or renews according to what the locked schema supports |
| Payments       | Provider webhook is authoritative; all transitions are transactional and idempotent                                                   |
| Files          | Private object keys in the database; short-lived signed access after authorization                                                    |
| Video          | Short-lived signed playback with enrollment checks and domain restrictions; no claim of absolute download prevention                  |
| Tests          | Tests ship with every phase; the later testing phase is a coverage and E2E audit                                                      |
| Security       | Baseline controls ship with the affected feature; the hardening phase is an audit                                                     |
| Health         | `/health/live` checks the process; `/health/ready` checks dependencies                                                                |

## Business rules requiring schema confirmation

- Whether expired enrollment is renewed in place or recorded as a new enrollment.
- The representation of required lessons and course completion.
- Whether free lessons are anonymous or require a student account.
- Quiz attempt snapshots, server-enforced deadlines, and content versioning.
- The records used for favorites, recent views, recommendations, activity, and notification preferences.

Until confirmed, implementations must expose interfaces and tests without inventing incompatible persistence fields.

## Defaults needing owner confirmation before their feature starts

- Video provider: Cloudflare Stream or Bunny Stream.
- Email delivery provider.
- Whether public certificate verification shows a full or masked student name. Default: masked.
- Homepage statistics: computed values with optional administrative overrides.
- Video completion threshold. Proposed default: 90% watched, with server-side validation.
- Whether passing required quizzes is necessary for course completion. Proposed default: yes.
