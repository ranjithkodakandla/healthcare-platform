#!/usr/bin/env bash
# Build + push + deploy Citizen / Provider / Admin Next apps to Cloud Run (dev).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${GCP_PROJECT:-sahyak}"
REGION="${GCP_REGION:-asia-south1}"
REPO="${REGION}-docker.pkg.dev/${PROJECT}/sahayak-dev"
API_URL="${API_URL:-https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app}"
TAG="${TAG:-session24}"

APPS=(citizen-app provider-portal admin-console)
SERVICE_FOR_APP() {
  case "$1" in
    citizen-app) echo "sahayak-dev-citizen" ;;
    provider-portal) echo "sahayak-dev-provider" ;;
    admin-console) echo "sahayak-dev-admin" ;;
  esac
}

load_env() {
  local app="$1"
  local file="$ROOT/apps/${app}/.env.local"
  if [[ ! -f "$file" ]]; then
    echo "Missing $file" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a
  # Prefer Cloud Run API URL over local localhost if set in file.
  source "$file"
  set +a
  export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$API_URL}"
  # Force API to Cloud Run for deployed builds (local .env.local may be localhost after edits).
  if [[ "${FORCE_CLOUD_API:-1}" == "1" ]]; then
    export NEXT_PUBLIC_API_URL="$API_URL"
  fi
}

build_push() {
  local app="$1"
  local image="${REPO}/${app}:${TAG}"
  load_env "$app"
  echo "=== Building $image ==="
  docker buildx build --platform linux/amd64 \
    -f "$ROOT/apps/web.Dockerfile" \
    --build-arg "APP_NAME=${app}" \
    --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" \
    --build-arg "NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}" \
    -t "$image" \
    --push \
    "$ROOT"
  echo "$image"
}

deploy() {
  local app="$1"
  local service
  service="$(SERVICE_FOR_APP "$app")"
  local image="${REPO}/${app}:${TAG}"
  echo "=== Deploying $service ==="
  gcloud run deploy "$service" \
    --project="$PROJECT" \
    --region="$REGION" \
    --image="$image" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=5 \
    --set-env-vars="NODE_ENV=production" \
    --quiet
  gcloud run services describe "$service" \
    --project="$PROJECT" \
    --region="$REGION" \
    --format='value(status.url)'
}

main() {
  for app in "${APPS[@]}"; do
    build_push "$app"
    deploy "$app"
  done
  echo "=== Done ==="
  for app in "${APPS[@]}"; do
    svc="$(SERVICE_FOR_APP "$app")"
    url="$(gcloud run services describe "$svc" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
    echo "$app -> $url"
  done
}

main "$@"
