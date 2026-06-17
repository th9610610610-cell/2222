#!/bin/sh
set -e
node build-api.mjs
pnpm --filter @workspace/lotto-win run build
