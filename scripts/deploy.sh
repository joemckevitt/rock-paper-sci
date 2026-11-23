#!/usr/bin/env bash
# Deploy the current commit to Render. Render builds from GitHub, so the
# commit must be pushed first.
set -euo pipefail

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

if [[ -z "${RENDER_SERVICE_ID:-}" ]]; then
  echo "RENDER_SERVICE_ID is not set. Find it with 'render services' and add it to .env" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit and push them first." >&2
  exit 1
fi

commit=$(git rev-parse HEAD)
if ! git branch -r --contains "$commit" | grep -q .; then
  echo "Commit ${commit:0:7} is not on GitHub. Push it first." >&2
  exit 1
fi

echo "Deploying ${commit:0:7} to $RENDER_SERVICE_ID"
render deploys create "$RENDER_SERVICE_ID" --commit "$commit" --wait --confirm
