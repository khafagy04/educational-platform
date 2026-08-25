FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace @educational-platform/backend --include-workspace-root

FROM dependencies AS build
COPY backend backend
ARG DATABASE_URL=postgresql://platform:platform_dev_only@postgres:5432/educational_platform
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate --workspace @educational-platform/backend
RUN npm run build --workspace @educational-platform/backend

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --omit=optional --omit=peer --workspace @educational-platform/backend --include-workspace-root

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
USER node
EXPOSE 4000
CMD ["node", "backend/dist/server.js"]
