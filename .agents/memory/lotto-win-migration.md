---
name: Lotto Win Migration
description: Key decisions from migrating Next.js/Supabase app to Replit pnpm monorepo stack
---

## Auth
JWT tokens stored in localStorage as `lw_token`. bcryptjs for password hashing. `JWT_SECRET` must be a Replit Secret (not an env var in `.replit`) — server throws at startup if absent.

**Why:** Committed env vars in `.replit` [userenv] are versioned and visible; secrets are not. Any credential in `.replit` is a security violation.

## Routing
Using wouter (not react-router-dom — not installed). `useLocation()` returns `[pathname, navigate]`.

## API imports
- Use `import { z } from 'zod'` NOT `zod/v4` in api-server — esbuild can't resolve the subpath
- DB imported as `import { db, usersTable, ... } from '@workspace/db'`

## DB / Drizzle
- Relations defined in lib/db/src/schema/index.ts — required for `db.query.*.findMany({ with: { ... } })` pattern
- Use `and(eq(...), gte(...))` from drizzle-orm for multi-condition WHERE — do NOT use `&&` operator between SQL expressions
