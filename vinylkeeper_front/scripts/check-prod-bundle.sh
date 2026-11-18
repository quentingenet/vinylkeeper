#!/usr/bin/env bash
# Stops a release build that would talk to the wrong API: the web app in dist/ must call the production
# API and must not contain the local one. Run after `npm run build:prod`, before `npx cap sync`.
#   EXPECTED_API_URL overrides the expected address (default: the production API).
set -euo pipefail

cd "$(dirname "$0")/.."
EXPECTED_API_URL="${EXPECTED_API_URL:-https://api.vinylkeeper.org/api}"
LOCAL_API="localhost:8000"

[ -d dist/assets ] || { echo "dist/assets is missing: run npm run build:prod first" >&2; exit 1; }

if ! grep -rqF -- "$EXPECTED_API_URL" dist/assets; then
  echo "The bundle does not call $EXPECTED_API_URL: check VITE_API_VK_URL of the production build" >&2
  exit 1
fi
if grep -rqF -- "$LOCAL_API" dist; then
  echo "The bundle still contains $LOCAL_API: this is not a production build" >&2
  exit 1
fi
echo "Production bundle checked: it calls $EXPECTED_API_URL"
