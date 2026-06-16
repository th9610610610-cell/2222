#!/bin/bash
set -e
pnpm install --frozen-lockfile
if [ -n "$DATABASE_URL" ]; then
  pnpm --filter @workspace/db run push || echo "Warning: DB push failed, skipping (DB may not be available)"
else
  echo "Warning: DATABASE_URL not set, skipping DB push"
fi
