---
name: Vercel Prebuilt API Deployment
description: How to deploy the Express API as a Vercel serverless function alongside the Vite SPA (lotto-win-2 project) using the Build Output API.
---

## The Rule

`vercel build` only builds the frontend (Vite). To ship the Express API as a serverless function, you must manually inject it into `.vercel/output/functions/` and deploy with `--prebuilt`.

**Why:** Vercel's `@vercel/static-build` builder (detected as "vite" framework) only produces static files. The `functions` key in `vercel.json` has no effect when you run `vercel deploy --archive=tgz` — functions never appear in the deployment (`"functions": null`). The Build Output API is the only reliable escape hatch.

**How to apply:**

1. Build the Express handler into a CJS bundle with esbuild from `artifacts/api-server/`:
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

2. Run `vercel build --yes --token=$VERCEL_TOKEN` to produce `.vercel/output/` (static-only).

3. Inject the function:
   ```
   .vercel/output/functions/api/index.func/index.js  ← CJS bundle
   .vercel/output/functions/api/index.func/.vc-config.json
   ```
   `.vc-config.json`:
   ```json
   { "runtime": "nodejs20.x", "handler": "index.js", "maxDuration": 30, "launcherType": "Nodejs", "shouldAddHelpers": true }
   ```

4. Update `.vercel/output/config.json` — prepend API route before filesystem handler:
   ```json
   { "src": "^/api(/.*)?$", "dest": "/api/index" }
   ```

5. Change `.vercel/output/builds.json` `target` from `"preview"` to `"production"`.

6. Deploy: `vercel deploy --prebuilt --prod --yes --token=$VERCEL_TOKEN`

## Vercel Project Details
- Project ID: `prj_PbLTocYLEHqX4lGhysQhTREM76TP`
- Org/Account ID: `uq48Cxbqru5BmAu26oaxAq5j`
- Live URL: `https://lotto-win-2.vercel.app`
- `.vercel/project.json` in workspace root links to this project
