#!/usr/bin/env bash
# Build, push, and deploy a Next.js app image to Cloud Run (CI).
set -euo pipefail

: "${APP:?APP required}"
: "${SERVICE:?SERVICE required}"
: "${TAG:?TAG required}"
: "${GCP_PROJECT_ID:?}"
: "${GCP_REGION:?}"
: "${AR_REPO:?}"
: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL required}"

IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/${APP}:${TAG}"

echo "Building $IMAGE"
docker build -f apps/web.Dockerfile \
  --build-arg "APP_NAME=${APP}" \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY:-}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}" \
  --build-arg "NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID:-}" \
  -t "$IMAGE" .

docker push "$IMAGE"

PREV=$(gcloud run services describe "$SERVICE" --region="$GCP_REGION" --format='value(status.latestReadyRevisionName)' || true)
echo "Previous revision: ${PREV:-none}"

gcloud run deploy "$SERVICE" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --image="$IMAGE" \
  --platform=managed \
  --port=8080 \
  --quiet

echo "Deployed $SERVICE ← $IMAGE"
if [[ -n "${PREV:-}" ]]; then
  echo "Rollback: gcloud run services update-traffic $SERVICE --to-revisions=${PREV}=100 --region=$GCP_REGION --project=$GCP_PROJECT_ID"
fi
