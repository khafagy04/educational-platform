# Prisma schema

The user authorized creation of the previously missing schema. Phase 2 established the locked persistence contract in `schema.prisma`, the initial migration in `migrations/20260824223041_initial`, realistic idempotent fixtures in `seed.ts`, and model documentation in `SCHEMA_NOTES.md`.

Run database tasks from the repository root:

```powershell
npm run db:validate --workspace @educational-platform/backend
npm run db:generate --workspace @educational-platform/backend
npm run db:migrate --workspace @educational-platform/backend
npm run db:seed --workspace @educational-platform/backend
```

After Phase 2, do not edit the schema casually. A change must be justified by a product requirement, reviewed against `docs/phase-0/SCHEMA_COMPATIBILITY.md`, implemented as a named migration, and reflected in `SCHEMA_NOTES.md` and relevant tests.
