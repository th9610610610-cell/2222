---
name: Lotto Win Migration
description: Key decisions from migrating Next.js/Supabase app to Replit pnpm monorepo stack
---

## Auth
JWT tokens stored in localStorage as `lw_token`. bcryptjs for password hashing. `JWT_SECRET` env var is required at startup (no fallback — server throws if absent).

**Why:** Insecure fallback defaults make tokens forgeable with a known key.

## Routing
Using wouter (not react-router-dom — not installed). `useLocation()` returns `[pathname, navigate]`.

## API imports
- Use `import { z } from 'zod'` NOT `zod/v4` in api-server — esbuild can't resolve the subpath
- DB imported as `import { db, usersTable, ... } from '@workspace/db'`

## DB relations
Drizzle relations defined in lib/db/src/schema/index.ts — required for `db.query.ticketsTable.findMany({ with: { draw: true } })` pattern.

**Why:** Drizzle's relational query API requires explicit `relations()` definitions even when foreign keys exist.

## Pages location
Real pages live in `artifacts/lotto-win/src/pages/` (not `src/app/` which is legacy Next.js structure left in place but unused).
