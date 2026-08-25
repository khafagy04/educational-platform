# API reference

Base path: `/api/v1`. JSON responses use `{ "data": ... }`; failures use `{ "error": { "code", "message", "details?" } }`. Protected routes require `Authorization: Bearer <access token>`. Refresh/logout additionally use the HttpOnly refresh cookie and trusted origin.

- Auth: `POST /auth/register|login|refresh|logout|verify-email|resend-verification|forgot-password|reset-password`, `GET /auth/me|role-check`.
- Catalog: grade/subject CRUD; public `GET /courses` with search/filter/sort/page; `GET /courses/slug/:slug`; staff course/module/lesson/thumbnail/attachment CRUD and reorder routes.
- Video: staff `POST|DELETE /lessons/:id/video`; enrolled `GET /lessons/:id/video-token`.
- Commerce: `GET /wallet|wallet/transactions`; wallet top-up, wallet purchase, direct checkout, order lookup, and both Fawaterk webhook spellings.
- Learning: lesson/course progress, student home, My Courses/player/favorites, profile/password/preferences, quizzes/questions/attempts/manual grading.
- Certificates/content: public verification, owner download, testimonials and moderation, FAQ CRUD, public/staff settings, notifications and read state.
- Staff: overview, paged courses, students/detail/status, course quizzes, site content, grading, revenue/payment/engagement analytics and CSV/XLSX exports.
- Operations: liveness/readiness/component health, private local-storage delivery and rate-limited frontend error intake.

The machine-readable integration contract is in `docs/openapi.yaml`. Route-specific Zod validators remain the source of truth for exact field lengths, conditional rules and upload limits.
