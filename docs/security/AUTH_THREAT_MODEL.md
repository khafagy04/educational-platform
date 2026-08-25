# Authentication threat model

Status: Phase 4 implementation review complete; real email-delivery verification pending.

## Assets and trust boundaries

The protected assets are password hashes, email/reset capabilities, access-token signing material, refresh sessions, student personal data, and privileged instructor/admin actions. Browser input, HTTP headers, cookies, email links, and all future provider callbacks are untrusted. Controllers validate inputs, services enforce authentication rules, repositories are the only Prisma boundary, and PostgreSQL is trusted only after transport and deployment controls are applied.

## Threats and controls

| Threat                                      | Control                                                                                                                                       | Verification                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Credential stuffing and brute force         | bcrypt cost 12, generic login failure, bounded auth rate limit                                                                                | API tests cover invalid credentials; production monitoring must tune limits                          |
| User enumeration                            | forgot-password always returns the same accepted response                                                                                     | Integration test compares success behavior for existing and missing addresses                        |
| Password disclosure                         | passwords are accepted only through validated bodies, hashed before persistence, and excluded from structured request logs                    | Repository stores only `passwordHash`; logger redaction is configured                                |
| Verification/reset-token database leak      | 256-bit opaque values; only peppered SHA-256 hashes are stored; token type, expiry, and one-time use are checked                              | Integration tests consume verification/reset links and reject reuse through the repository invariant |
| Concurrent one-time-token reuse             | conditional `usedAt: null` update inside the same transaction permits only one consumer                                                       | Repository uses an affected-row count gate                                                           |
| Refresh-token theft                         | 256-bit opaque token in an HTTP-only, SameSite=Strict cookie; only its hash is persisted; device/IP context retained                          | Login integration test confirms cookie issuance and protected access                                 |
| Refresh replay                              | every use atomically revokes the prior token and links a replacement; reuse revokes the entire family                                         | Integration test replays the original token and confirms the replacement is then rejected            |
| Concurrent refresh race                     | conditional `revokedAt: null` update elects one rotation winner; a loser triggers family revocation                                           | Repository affected-row gate and replay-family path                                                  |
| Access-token forgery or algorithm confusion | fixed HS256 implementation verifies header type/algorithm, signature with timing-safe comparison, issuer, audience, expiry, role, and subject | Invalid and malformed bearer-token API tests return 401                                              |
| Access token stored persistently in browser | contract requires in-memory access token; refresh token remains HTTP-only                                                                     | Frontend auth implementation must retain this rule in Phase 17                                       |
| CSRF on cookie-authenticated mutation       | SameSite=Strict cookie, narrow cookie path, strict CORS allowlist, and explicit Origin rejection for refresh/logout                           | Add deployed-origin tests when public domains are known                                              |
| Privilege escalation                        | public registration hard-codes student behavior; JWT role is verified; route guards deny by default                                           | Integration test confirms student denial on instructor/admin route                                   |
| Suspended/unverified account use            | login and refresh both require active status and verified email                                                                               | Integration test confirms login is rejected before verification                                      |
| Password-reset session persistence          | successful reset revokes all active refresh tokens transactionally                                                                            | Integration suite covers reset and subsequent login/logout behavior                                  |
| Secret leakage in logs                      | authorization, cookies, set-cookie, password, and token paths are redacted; local email adapter logs recipient only                           | Test output demonstrates redacted headers; operational log review remains required                   |

## Residual risks and deployment gates

- The in-memory rate limiter is correct for one process; Phase 12 must move distributed counters to Redis before horizontal scaling.
- HTTPS, HSTS, secure cookies, reverse-proxy trust, production secret rotation, and CSP are deployment controls verified again in Phase 22.
- A real email sandbox must prove sender verification, deliverability, link construction, and secret handling before Phase 4 is operationally accepted.
- Recovery support procedures must verify identity without allowing staff to retrieve passwords or raw tokens.

## Review checklist

- No instructor/admin self-registration route exists.
- No raw refresh, verification, or reset token is persisted or logged.
- Access-token claims and algorithm are fixed and validated.
- One-time and rotation operations have database concurrency gates.
- Authentication errors do not disclose whether an account exists.
- Provider credentials remain environment-only and outside Git.
