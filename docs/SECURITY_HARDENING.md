# Security hardening checklist

| OWASP concern           | Control                                                                           | Verification                                                       |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Broken access control   | JWT authentication, role middleware, enrollment/owner checks, private object keys | API tests cover 401/403 and cross-user denial                      |
| Cryptographic failures  | bcrypt 12, hashed opaque tokens, short JWTs, HTTPS/HSTS in production             | auth threat model and production proxy                             |
| Injection               | Prisma parameterization and Zod validation                                        | every mutation route uses a body schema; uploads use Multer limits |
| Insecure design         | webhook-authoritative activation, idempotency keys, immutable quiz snapshots      | payment/quiz threat models and integration tests                   |
| Misconfiguration        | strict CORS, no `x-powered-by`, CSP, frame denial, permissions policy             | response-header smoke check                                        |
| Vulnerable components   | production high/critical `npm audit` gate in CI                                   | optional CLI peer and moderate Excel export advisories are tracked |
| Authentication failures | rate limits, refresh rotation/replay-family revocation, verified-email login      | auth integration suite                                             |
| Integrity failures      | HMAC Fawaterk webhook verification and replay inbox                               | invalid/unsigned/replayed webhook tests                            |
| Logging failures        | request IDs, JSON logs, rotation, sensitive-action AuditLog, optional error DSN   | query AuditLog after staff actions                                 |
| SSRF                    | provider endpoints are configuration-only; users cannot supply outbound URLs      | configuration schema review                                        |

Provider-backed penetration checks requiring real Fawaterk/R2/Stream/SMTP credentials remain deferred and are never treated as passed locally.
