# Educational Platform

Arabic-first educational platform for a single instructor, organized as an npm workspace monorepo.

Public UI showcase: [https://a7mad3lwan.github.io/educational-platform/](https://a7mad3lwan.github.io/educational-platform/)

> GitHub Pages hosts the static public-facing showcase only. Authentication, dashboards, payments,
> video security, and other server-backed features require the full local or production stack.

## Prerequisites

- Node.js 24+
- npm 11+
- Docker with Compose

## Local development

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`.
2. Run `npm install`.
3. Run `docker compose up --build` for the full stack, or `npm run dev` when PostgreSQL is already available.

Frontend: `http://localhost:3000`

Backend liveness: `http://localhost:4000/api/v1/health/live`

Backend readiness: `http://localhost:4000/api/v1/health/ready`

## Quality commands

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Project decisions and implementation gates live in [`docs/phase-0`](docs/phase-0/README.md). Phases 0–22 are implemented; see [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for verified release checks and the external provider checks deferred until credentials are supplied.

For a no-cost student and teacher dashboard review environment, follow
[`docs/DASHBOARD_FREE_DEPLOYMENT.md`](docs/DASHBOARD_FREE_DEPLOYMENT.md).
