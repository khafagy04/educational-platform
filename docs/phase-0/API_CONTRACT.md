# API Contract Baseline

## Conventions

- API base path: `/api/v1`.
- JSON uses camelCase and UTF-8.
- Dates are ISO 8601 UTC instants; the UI displays them in `Africa/Cairo`.
- Monetary amounts are decimal strings with currency, for example `{ "amount": "250.00", "currency": "EGP" }`.
- Success responses use `{ "data": ... }`; paginated responses add `meta`.
- Errors use `{ "error": { "code": "STABLE_CODE", "message": "...", "details": [] } }`.
- Every request receives an `x-request-id`; the same ID appears in logs and error responses.
- Mutating payment requests accept an idempotency key where applicable.

## Authentication contract

- Access tokens are short-lived bearer tokens and are never persisted in browser storage.
- Refresh tokens are rotated in secure HTTP-only cookies and stored as hashes server-side.
- Reuse of a rotated token revokes its token family.
- Authentication errors return 401; authenticated users lacking permission or entitlement receive 403.

## Payment contract

- Client redirects never activate wallets or enrollments.
- A verified webhook is normalized to an internal event and processed exactly once inside a database transaction.
- Duplicate or out-of-order delivery returns a successful acknowledgement after confirming no invalid transition occurred.
- The raw request bytes needed for signature verification must be preserved before JSON parsing.

## Versioning and documentation

Zod schemas are the validation source, and OpenAPI must be generated from or tested against them. Breaking changes require a new API version or an explicit migration plan.
