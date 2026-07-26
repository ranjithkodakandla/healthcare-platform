# Sahayak Next.js apps — build from monorepo root:
#   docker build -f apps/web.Dockerfile --build-arg APP_NAME=citizen-app ...
ARG APP_NAME=citizen-app

FROM node:20-bookworm-slim AS build
ARG APP_NAME
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/citizen-app/package.json apps/citizen-app/
COPY apps/provider-portal/package.json apps/provider-portal/
COPY apps/admin-console/package.json apps/admin-console/
COPY packages/shared-constants/package.json packages/shared-constants/
RUN npm ci

COPY apps/${APP_NAME} apps/${APP_NAME}

# NEXT_PUBLIC_* must be present at build time (inlined into the client bundle).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NODE_ENV=production

RUN npm run build -w ${APP_NAME}

FROM node:20-bookworm-slim AS runtime
ARG APP_NAME
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV APP_NAME=${APP_NAME}

COPY --from=build /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=build /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=build /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

EXPOSE 8080
CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]
