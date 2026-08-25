# Deployment and rollback

1. Build immutable backend/frontend images in CI with the public API URL supplied at frontend build time.
2. Copy `.env.production.example` to a secret store-backed `.env.production`; never commit it. Build the frontend image with `NEXT_PUBLIC_API_URL=https://your-domain/api/v1`.
3. Pull images and run `docker compose -f compose.prod.yaml run --rm backend npm run db:migrate:deploy --workspace backend`.
4. Start with `docker compose -f compose.prod.yaml up -d` and verify `/api/v1/health/ready`, the landing page, login, Redis queue logs, and a read-only report.
5. Smoke-test a provider sandbox payment only after credentials are present. Seed is for staging only, never production.

Rollback application images to the prior digest. Database migrations must be backward-compatible; if a destructive schema rollback is unavoidable, stop writes and restore the pre-deployment verified dump using the disaster-recovery runbook.

Required secrets: PostgreSQL, Redis, JWT access secret, refresh pepper, R2, Stream, Fawaterk, SMTP, domain, image digests, and optional error-reporting DSN.
