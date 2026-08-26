# Free dashboard demo deployment

This profile deploys only the working student and teacher/admin dashboard experience. Payments,
SMTP email, cloud video, uploads, and background queues use local or disabled adapters. It is a
review environment, not a production commerce deployment.

## Architecture

- Vercel Hobby: Next.js frontend from the repository root using `vercel.json`.
- Render Free: Express API using `render.yaml` and `backend/Dockerfile.dashboard`.
- Neon Free: PostgreSQL.
- Redis: disabled (`JOB_QUEUE_ENABLED=false`). Public response caching fails open when Redis is
  unavailable; authenticated dashboard endpoints do not depend on the cache.

## 1. Create the Neon database

1. Create a Neon project and copy its pooled PostgreSQL connection string.
2. Keep the connection string private. Render will request it as `DATABASE_URL` when the Blueprint
   is created.

The Render container runs committed Prisma migrations before every start. The migrations are
idempotent. Demo seeding is also idempotent and refreshes only the configured demo credentials and
sample content.

## 2. Create the Render backend

1. In Render, choose **New > Blueprint** and connect `khafagy04/educational-platform`.
2. Render discovers the root `render.yaml` file.
3. Supply every value marked `sync: false`:

| Variable                   | Value                                                           |
| -------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`             | Neon pooled connection string                                   |
| `CORS_ALLOWED_ORIGINS`     | Initial Vercel URL, for example `https://midad-demo.vercel.app` |
| `APP_URL`                  | The same Vercel URL                                             |
| `API_PUBLIC_URL`           | Render URL without `/api/v1`                                    |
| `SEED_INSTRUCTOR_EMAIL`    | Teacher login email                                             |
| `SEED_INSTRUCTOR_PASSWORD` | Unique password with at least 12 characters                     |
| `SEED_ADMIN_EMAIL`         | Admin login email, which may match a separate owner address     |
| `SEED_ADMIN_PASSWORD`      | Different unique password with at least 12 characters           |
| `SEED_STUDENT_EMAIL`       | Demo student login email                                        |
| `SEED_STUDENT_PASSWORD`    | Different unique password with at least 12 characters           |

The generated API URL is expected to be
`https://midad-dashboard-api-khafagy04.onrender.com`. If Render changes the service name, update
`API_PUBLIC_URL` to the actual URL without `/api/v1`.

Verify the backend at:

```text
https://midad-dashboard-api-khafagy04.onrender.com/api/v1/health/ready
```

## 3. Create the Vercel frontend

1. Import `khafagy04/educational-platform` into Vercel.
2. Keep **Root Directory** set to the repository root (`.`). The root `vercel.json` handles the npm
   workspace build.
3. Add both variables before the first deployment:

```text
NEXT_PUBLIC_API_URL=https://midad-dashboard-api-khafagy04.onrender.com/api/v1
API_INTERNAL_URL=https://midad-dashboard-api-khafagy04.onrender.com/api/v1
```

4. Deploy, copy the final `*.vercel.app` URL, and update `CORS_ALLOWED_ORIGINS` and `APP_URL` in
   Render if the final URL differs from the value entered earlier. Redeploy the Render service after
   changing them.

## 4. Verify both roles

1. Open `/login` on the Vercel URL.
2. Sign in with `SEED_STUDENT_EMAIL` and open `/dashboard`.
3. Sign out, then sign in with `SEED_INSTRUCTOR_EMAIL` or `SEED_ADMIN_EMAIL` and open `/admin`.
4. Verify `/api/v1/health/ready` returns HTTP 200 after Render wakes up.

## Free-tier limitations

- The Render API sleeps after inactivity, so the first request can take roughly one minute.
- Local uploads disappear when the Render container restarts.
- Local email accepts requests but sends no messages; use the pre-verified seeded accounts.
- Vercel Hobby is for personal, non-commercial use.
- Never reuse these demo passwords for another account or production deployment.
