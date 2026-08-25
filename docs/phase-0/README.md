# Phase 0 — Product and Architecture Baseline

Status: **complete with external gates**

Date: 2026-08-25

Phase 0 converts the original build prompt into contracts that can be checked during implementation. Reversible technical defaults are accepted here; provider credentials and the locked Prisma schema remain external gates.

## Outputs

- [DECISIONS.md](./DECISIONS.md): agreed and defaulted product rules.
- [DELIVERY_PLAN.md](./DELIVERY_PLAN.md): dependency-corrected implementation order.
- [SCHEMA_COMPATIBILITY.md](./SCHEMA_COMPATIBILITY.md): features the locked schema must support.
- [API_CONTRACT.md](./API_CONTRACT.md): conventions and critical-flow contracts.
- [SECURITY_BASELINE.md](./SECURITY_BASELINE.md): controls that apply from the first feature.
- [PROVIDER_GATES.md](./PROVIDER_GATES.md): external choices and credentials needed later.
- [SPEC_ALIGNMENT.md](./SPEC_ALIGNMENT.md): how the attached build prompt and Phase 0 corrections interact.
- [adr/](./adr/): architecture decision records.

## Entry and exit criteria

Phase 1 may begin now because its foundations do not depend on the database schema or external providers.

Phase 2 must not begin until `backend/prisma/schema.prisma` is supplied and passes the compatibility review. A mismatch is reported; the locked schema is never silently changed.

Real provider acceptance tests remain gated until sandbox credentials are available. Local adapters may emulate provider boundaries during development, but may not be presented as production acceptance.
