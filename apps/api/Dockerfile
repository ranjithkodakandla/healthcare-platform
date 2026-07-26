# Sahayak API — build from monorepo root:
#   docker build -f apps/api/Dockerfile -t sahayak-api .
FROM node:20-bookworm-slim AS build

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-constants/package.json packages/shared-constants/
RUN npm ci

COPY packages/shared-constants packages/shared-constants
COPY apps/api apps/api

RUN npm run build -w @sahayak/shared-constants \
  && npx prisma generate --schema apps/api/prisma/schema.prisma \
  && cd apps/api && npx tsc -p tsconfig.build.json

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-constants/package.json packages/shared-constants/
RUN npm ci --omit=dev

COPY --from=build /app/packages/shared-constants/dist packages/shared-constants/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/node_modules/@prisma node_modules/@prisma

WORKDIR /app/apps/api
EXPOSE 8080
CMD ["node", "dist/main.js"]
