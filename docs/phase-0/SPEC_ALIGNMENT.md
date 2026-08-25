# Build Specification Alignment

The user-provided file `claude-code-build-prompt (2).md` is the master product and phase specification.

Phase 0 does not replace or reduce that scope. It applies these amendments while the original phases are implemented:

1. Testing, security, OpenAPI and logging are continuous acceptance requirements, with their later phases retained as final audits.
2. Phase 8 publishes a course-completion event; Phase 10 adds its certificate consumer.
3. The analytics backend is completed before the Phase 15 analytics interface.
4. Features named only in frontend tasks require an explicit backend and schema contract before they are presented as complete.
5. Liveness and readiness are separate endpoints.
6. Payment and wallet transitions are transactional, idempotent and use exact decimal money values.
7. Video protection means authorized, short-lived signed playback—not an impossible guarantee against all copying.
8. The locked Prisma schema is never silently changed. A missing capability blocks its relevant phase and is reported.

All other confirmed business rules and feature requirements in the master prompt remain in force. Work proceeds through its phases in order, subject to the dependency corrections in `DELIVERY_PLAN.md`.
