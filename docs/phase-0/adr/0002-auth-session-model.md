# ADR 0002: Access and refresh session model

Status: Accepted as baseline; verify against the locked schema

Use a short-lived JWT access token and a long-lived opaque refresh token. The browser receives refresh tokens in secure HTTP-only cookies. The database stores only token hashes with rotation-family metadata. Access tokens stay in application memory rather than local storage.

Refresh reuse revokes the family. Password reset revokes all user sessions. Cookie-authenticated state changes use origin/CSRF controls.
