#!/bin/sh
set -eu

npm run db:migrate:deploy --workspace @educational-platform/backend

if [ "${DEMO_SEED_ENABLED:-true}" = "true" ]; then
  npm run db:seed --workspace @educational-platform/backend
fi

exec node backend/dist/server.js
