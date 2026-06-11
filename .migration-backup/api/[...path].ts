import type { IncomingMessage, ServerResponse } from 'node:http'
import app from '../artifacts/api-server/src/app'
import { runMigrations } from '../lib/db/src/migrate'

let migrated = false
async function ensureMigrated() {
  if (migrated) return
  await runMigrations(process.env.DATABASE_URL!)
  migrated = true
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureMigrated().catch((err) =>
    console.warn('[migrate] warning:', (err as Error)?.message)
  )
  return app(req as any, res as any)
}
