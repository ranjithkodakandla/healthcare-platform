#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose up -d

if [ ! -f apps/api/.env ]; then
  cp .env.example apps/api/.env
fi

cd apps/api
npm install
npm run build
node dist/main.js
