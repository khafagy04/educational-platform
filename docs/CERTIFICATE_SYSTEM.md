# Certificate System

## Public privacy decision

Public verification confirms validity, certificate number, course title, and issue date. Student names are partially masked per name segment (for example, `ليلى أحمد` becomes `ل*** أ***`). The verification response never includes `fileKey` or a download URL.

## Issuance contract

- The existing `course.completed` domain event is the only automatic issuance trigger.
- `enrollmentId` is unique in `Certificate`, and the certificate number is deterministic (`EDU-YYYY-XXXXXXXX`), making retries idempotent.
- Generation embeds the student name, course title, issue date, certificate number, and a QR code for the public verification URL.
- The PDF is uploaded through the private storage boundary and the database transitions from `PENDING` to `GENERATED`. Failures transition to `FAILED` with a bounded diagnostic message.
- Phase 10 handles the event in process. Phase 12 replaces this handler with a retrying BullMQ worker so completion requests do not wait for PDF generation.

## Download contract

- `GET /me/certificates/:id/download` requires authentication and matches both certificate ID and current user ID.
- The endpoint returns a five-minute signed URL, never the private key.
- R2 uses the AWS SDK v3 `GetObject` presigner. The deterministic local adapter uses an HMAC-signed, expiring token resolved by `/api/v1/private-storage/:token`.
- Public verification never grants file access.

## Deferred production check

The local adapter and an in-memory integration adapter verify generation, authorization, expiry metadata, and download behavior. A real Cloudflare R2 signed-download check remains pending until the owner supplies R2 credentials; it is not counted as passed.
