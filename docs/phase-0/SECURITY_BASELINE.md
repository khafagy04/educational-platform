# Security Baseline

Security work begins with the first route and is audited again near release.

- Validate every body, path, query, header and external-provider payload at the boundary.
- Deny by default in authentication, RBAC and ownership/entitlement checks.
- Rate-limit auth, token issuance, payment initiation, signed-media issuance and public verification.
- Use parameterized database access through Prisma repositories only.
- Hash passwords with an approved adaptive password hash; never log credentials or tokens.
- Rotate and hash refresh tokens; protect cookie-authenticated mutation from CSRF.
- Verify webhook signatures over raw bytes, check timestamp/replay windows and enforce event uniqueness.
- Constrain upload type, size, filename and storage key; scan files when the chosen production pipeline supports it.
- Use short-lived media URLs. Treat them as bearer secrets and never log them.
- Redact authorization headers, cookies, passwords, reset tokens, provider signatures and sensitive personal data.
- Apply secure headers, a strict origin allowlist and HTTPS in deployed environments.
- Record sensitive administrative actions in an append-oriented audit log.
- Keep backups encrypted, test restore procedures and restrict operational access.

Threat-model reviews are required before authentication, payment, uploads/video and deployment are marked complete.
