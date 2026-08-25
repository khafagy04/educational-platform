# Project status

## Current state

Phases 0–22 are implemented and locally verified. Production-provider acceptance remains explicitly deferred until the owner supplies SMTP, Cloudflare R2, Cloudflare Stream, and Fawaterk sandbox credentials.

## Phase completion

| Phase | Delivered outcome                                                                                                   | Status                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 0–3   | Product/security contracts, monorepo, locked Prisma schema and migrations, Express/Next/PostgreSQL/Redis foundation | Complete                                     |
| 4     | Full auth lifecycle, RBAC, refresh rotation/replay protection, Arabic email adapters                                | Code complete; real SMTP delivery deferred   |
| 5     | Grade/subject/course/module/lesson/attachment APIs and private storage boundary                                     | Complete locally; real R2 check deferred     |
| 6     | Direct video upload boundary and short-lived enrollment-authorized playback grants                                  | Complete locally; real Stream check deferred |
| 7     | Wallet, orders, exact-decimal ledger, signed/idempotent Fawaterk webhooks and expiry                                | Complete locally; sandbox check deferred     |
| 8–12  | Progress, quizzes/grading, QR PDF certificates, content/notifications, BullMQ jobs                                  | Complete                                     |
| 13    | Arabic RTL public site with live catalog, grade/course pages, auth recovery and placement check                     | Complete                                     |
| 14    | Student dashboard, player, favorites, wallet, quizzes, certificates, notifications and profile                      | Complete                                     |
| 15    | Instructor/admin overview, course builder, students, grading and site content                                       | Complete                                     |
| 16    | Reconciled revenue/payment/engagement analytics with UTF-8 CSV and styled XLSX exports                              | Complete                                     |
| 17    | Search, combined filters, sorting, pagination and a 56-course discovery seed                                        | Complete                                     |
| 18    | Redis response caching, selective invalidation and query indexes                                                    | Complete                                     |
| 19    | HTTPS/HSTS/CSP hardening, action rate limits, suspension and durable audit logging                                  | Complete                                     |
| 20    | CI, strict checks and real PostgreSQL/Redis integration suite                                                       | Complete                                     |
| 21    | Health checks, log rotation, error intake, backup and isolated restore drill                                        | Complete                                     |
| 22    | Production Compose/Caddy templates, deployment/rollback/runbooks and API documentation                              | Complete locally                             |

## Release verification

- Formatting, linting, strict type-checking, Prisma generation/migrations, backend build and the complete frontend production route build pass.
- The real PostgreSQL/Redis test run passes 10 files and 36/36 backend tests. Database integration files run serially because they intentionally share and clean one disposable test database.
- Backend and frontend Docker images build successfully. PostgreSQL, Redis, backend and frontend containers all report healthy.
- Container smoke tests return API readiness `ok`, an HTTP 200 RTL homepage, a successful bcrypt-protected instructor login, 56 courses and 1 student.
- Live catalog acceptance proves combined search/free/price sorting, 11 matching free courses, and cache `MISS` then `HIT` behavior.
- Analytics reconcile to one paid EGP 450 order; payment and engagement reports return persisted data. The XLSX was parsed and visually checked for Arabic layout, unclipped text and numeric formatting.
- Sensitive staff actions are present in `AuditLog`, including settings changes and manual quiz grading.
- The SHA-256-verified PostgreSQL backup restored into an isolated temporary database with 2 users, 56 courses and 1 order; the drill database was removed afterward.
- Desktop/mobile browser QA completed for the public RTL flows with no horizontal overflow or console warnings. Final container HTML and responsive production builds were rechecked after the release changes.
- The deployable dependency graph has zero high or critical audit findings when optional CLI peers are excluded. ExcelJS retains a moderate advisory through `uuid@8`; the vulnerable buffer-taking UUID APIs are not called by this application. Prisma's optional CLI/config peer has a high advisory upstream, but the backend runtime prunes optional/peer/development packages.

## Credential-gated production checks

The following are not claimed as passed: real SMTP delivery/sender verification, real R2 upload and signed download, real Cloudflare Stream upload/playback, and a real Fawaterk sandbox payment/webhook reconciliation. Run the provider smoke checks in the deployment runbook after credentials are supplied.
