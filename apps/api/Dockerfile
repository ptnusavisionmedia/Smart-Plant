# Build context MUST be the repository root (see infra/docker-compose.prod.yml),
# since this image needs the workspace packages (@smart-plant/shared, @smart-plant/db)
# that apps/api depends on via `workspace:*`.
#
# Internal packages ship TypeScript source only (no dist/ build step — see
# packages/shared/package.json and packages/db/package.json "exports"), so the
# runtime stage still executes via `tsx`, exactly like local `pnpm dev`.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile --filter @smart-plant/api... --filter @smart-plant/db... --filter @smart-plant/shared...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/api apps/api

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/server.ts"]
