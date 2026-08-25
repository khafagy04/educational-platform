# Dependency-Corrected Delivery Plan

The original 22 phases remain the scope. These corrections prevent forward dependencies and late security/testing rewrites.

## Continuous tracks

Every feature phase includes:

1. Zod validation and OpenAPI updates.
2. Authorization, rate-limit, audit, and privacy review appropriate to the route.
3. Unit tests for services, repository integration tests where persistence changes, and API tests for the feature.
4. Structured logging with secret and personal-data redaction.

The original Testing and Security Hardening phases become final audits rather than the first implementation of those concerns.

## Delivery sequence

| Stage      | Scope                                                        | Exit condition                                                             |
| ---------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 0          | Decisions, schema checklist, API/security/provider contracts | Documents accepted; external gates recorded                                |
| 1          | Monorepo, toolchain, RTL shell, containers, CI-ready scripts | Local quality commands pass; Compose configuration validates               |
| 2          | Locked Prisma schema, migration, seed, schema notes          | Schema supplied and compatibility-reviewed                                 |
| 3–7        | Backend core, auth, content, video, wallet/payment           | Critical backend flows pass API tests                                      |
| 8A         | Progress and course-completion event contract                | Completion emits an idempotent domain event; no certificate dependency yet |
| 9          | Quizzes and grading                                          | Timed attempts and mixed grading tested                                    |
| 10         | Certificate consumer and verification                        | Consumes course-completed event idempotently                               |
| 11–12      | Managed content, notifications, queues                       | Email/certificates use queues; scheduled expiry migrated                   |
| 13–14      | Public site and student application                          | Real APIs; no production mocks                                             |
| 16 backend | Analytics and exports                                        | Reconciles with seeded financial/progress data                             |
| 15         | Instructor/admin application, including analytics UI         | Full instructor workflow passes E2E                                        |
| 17–18      | Discovery, performance, caching                              | Query and invalidation tests pass                                          |
| 19–22      | Security/test audits, operations, deployment, documentation  | Restore drill, E2E suite and staging deployment succeed                    |

## Scope corrections

- The placement-test link is hidden until a placement-test backend contract is added.
- Favorites, recent views, recommendations, profile preferences, and suspension are not considered implemented until their persistence/API contracts exist.
- Phase 3 creates both liveness and readiness endpoints; liveness does not query the database.
- Phase 8 publishes a completion event. Phase 10 registers the certificate handler.
- Analytics backend work precedes the analytics admin UI.
