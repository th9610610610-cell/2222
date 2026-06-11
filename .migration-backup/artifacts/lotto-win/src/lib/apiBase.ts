/**
 * Returns the API base prefix for all fetch calls.
 *
 * - On Vercel: VITE_API_BASE = "https://your-api.vercel.app"
 *   → calls go to https://your-api.vercel.app/api/...
 *
 * - On Replit (dev): VITE_API_BASE is unset, falls back to BASE_URL
 *   → calls go to /api/... (same origin, proxied by Replit)
 */
export const API_BASE: string =
  (import.meta.env["VITE_API_BASE"] as string | undefined ?? import.meta.env.BASE_URL ?? '').replace(/\/$/, '')
