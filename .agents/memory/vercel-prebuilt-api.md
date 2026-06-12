---
name: Vercel Prebuilt API Deployment
description: How to deploy the Express API as a Vercel serverless function alongside the Vite SPA (lotto-win-2 project) using the Build Output API.
---

## The Rule

`vercel build` only builds the frontend (Vite). To ship the Express API as a serverless function, you must manually inject it into `.vercel/output/functions/` and deploy with `--prebuilt`.

**Why:** Vercel's `@vercel/static-build` builder (detected as "vite" framework) only produces static files. The `functions` key in `vercel.json` has no effect when you run `vercel deploy --archive=tgz` — functions never appear in the deployment (`"functions": null`). The Build Output API is the only reliable escape hatch.

## CRITICAL: Strict Sequential Order — Never Parallelize Steps 1 & 2

`vercel build` wipes `.vercel/output/` from scratch every run. You MUST run esbuild first, then `vercel build`, then copy the bundle into `.vercel/output/functions/`. Running esbuild and `vercel build` in the same parallel batch causes the function to be destroyed before it can be injected.

## How to apply

1. **esbuild** — build the Express handler into a CJS bundle from `artifacts/api-server/`:
   ```bash
   ./node_modules/.bin/esbuild src/vercel-handler.ts \
     --bundle --platform=node --format=cjs \
     --outfile=../../api/index.js \
     --external:pg-native --external:fsevents \
     --external:re2 --external:better-sqlite3 \
     '--footer:js=module.exports = handler;'
   ```
   - Do NOT externalize `nodemailer` — it must be bundled.
   - The footer `module.exports = handler;` is critical: esbuild CJS output for `export default` does NOT set `exports.default`, it just creates a local `handler` variable.

2. **vercel build** — wait for step 1 to finish, then:
   ```bash
   vercel build --yes --token=$VERCEL_TOKEN
   ```
   This produces `.vercel/output/` (static files only). **Must complete before step 3.**

3. **Inject function** — AFTER `vercel build` is done:
   ```
   .vercel/output/functions/api/index.func/index.js  ← copy from api/index.js
   .vercel/output/functions/api/index.func/.vc-config.json
   ```
   `.vc-config.json`:
   ```json
   { "runtime": "nodejs20.x", "handler": "index.js", "maxDuration": 30, "launcherType": "Nodejs", "shouldAddHelpers": true }
   ```

4. **Patch config.json** — prepend API route before filesystem handler in `.vercel/output/config.json`:
   ```json
   { "src": "^/api(/.*)?$", "dest": "/api/index" }
   ```

5. **Patch builds.json** — change `target` from `"preview"` to `"production"` in `.vercel/output/builds.json`.

6. **Deploy**: `vercel deploy --prebuilt --prod --yes --token=$VERCEL_TOKEN`

## Database URL — Supabase/Replit Quirk

The Replit DATABASE_URL for Supabase uses a username with a dot (`postgres.xxxx`) AND has a leading space in the password (char code 32). This causes two failures:

1. **`ERR_INVALID_URL`** — Node's `new URL()` (used internally by `pg`) fails on this format. Fix: manual URL parser in `lib/db/src/index.ts` using `lastIndexOf("@")` to extract user/password/host.

2. **`28P01` password auth failed** — the leading space in the raw password is NOT part of the real Supabase password. Fix: call `.trim()` on the extracted password.

Both fixes are already in `lib/db/src/index.ts` via the `parsePgUrl` function with `.trim()` applied to the password.

## Vercel Project Details
- Project ID: `prj_PbLTocYLEHqX4lGhysQhTREM76TP`
- Org/Account ID: `uq48Cxbqru5BmAu26oaxAq5j`
- Live URL: `https://lotto-win-2.vercel.app`
- `.vercel/project.json` in workspace root links to this project
