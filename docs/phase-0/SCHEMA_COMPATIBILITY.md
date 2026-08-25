# Locked Schema Compatibility Checklist

The user authorized creation of the missing schema. The review below records the Phase 2 schema outcome; the schema is now locked and later changes use reviewed migrations.

## Review outcome

## Identity and security

- `supported` — Users, roles, email verification timestamp, password hash and suspension state.
- `supported` — Hashed verification/reset tokens with type, expiry and one-time consumption.
- `supported` — Hashed refresh tokens with family/replacement relationships, device information, expiry and revocation.
- `supported` — Audit records containing actor, action, target, timestamp and safe metadata.

## Commerce

- `supported` — EGP-safe decimal amounts on Course, Order, Payment, Wallet and WalletTransaction.
- `supported` — Order price/currency snapshot independent of later course-price changes.
- `supported` — Unique provider payment/event identifiers for webhook idempotency.
- `supported` — Explicit pending, paid/completed and failed states.
- `supported` — Enrollment history; renewal creates a new order-linked record after expiration.
- `derivable` — Webhook duplication is constrained in the database; active-entitlement uniqueness is enforced by a serialized service transaction because PostgreSQL partial uniqueness is not expressible in the Prisma model.

## Learning

- `supported` — Stable course/module/lesson hierarchy and sort order.
- `supported` — Required/optional lesson semantics.
- `supported` — Progress position, percentage, completion and activity timestamps.
- `supported` — Quiz deadlines, attempts, answer records, essay grades and immutable question snapshots.
- `supported` — Idempotent certificate uniqueness by enrollment and certificate number.

## Product experience

- `supported` — Favorites, recent views, activity aggregation inputs and notification preferences.
- `supported` — Testimonial moderation, FAQ ordering, platform settings and notifications.
- `supported` — Private attachment/object keys and video provider identifiers only.

No required item is missing or ambiguous. The service-layer active-entitlement invariant must be implemented and tested in the commerce phase.
