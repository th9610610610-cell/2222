import pg from 'pg'
const { Pool } = pg

/**
 * Parse postgresql:// URL safely, handling passwords with special chars (@, ?, +, etc).
 * Uses lastIndexOf('@') to correctly find the auth/host boundary.
 */
function parsePgUrl(url: string): pg.PoolConfig {
  try {
    const protocolEnd = url.indexOf('://')
    if (protocolEnd === -1) return { connectionString: url }
    const afterProtocol = url.slice(protocolEnd + 3)
    const lastAt = afterProtocol.lastIndexOf('@')
    if (lastAt === -1) return { connectionString: url }
    const authPart = afterProtocol.slice(0, lastAt)
    const hostPart = afterProtocol.slice(lastAt + 1)
    const colonInAuth = authPart.indexOf(':')
    const user = colonInAuth !== -1 ? authPart.slice(0, colonInAuth) : authPart
    const rawPass = colonInAuth !== -1 ? authPart.slice(colonInAuth + 1) : ''
    const password = rawPass.includes('%') ? decodeURIComponent(rawPass) : rawPass
    const slashInHost = hostPart.indexOf('/')
    const hostport = slashInHost !== -1 ? hostPart.slice(0, slashInHost) : hostPart
    const database = slashInHost !== -1 ? hostPart.slice(slashInHost + 1).split('?')[0] : 'postgres'
    const colonInHost = hostport.lastIndexOf(':')
    const host = colonInHost !== -1 ? hostport.slice(0, colonInHost) : hostport
    const port = colonInHost !== -1 ? parseInt(hostport.slice(colonInHost + 1)) : 5432
    return { user, password, host, port, database }
  } catch {
    return { connectionString: url }
  }
}

export async function runMigrations(connectionString: string): Promise<void> {
  const isSupabase = connectionString.includes('supabase') || connectionString.includes('sslmode=require')
  const config = parsePgUrl(connectionString.trim())
  const pool = new Pool({ ...config, ssl: isSupabase ? { rejectUnauthorized: false } : false })
  const client = await pool.connect()
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)

    await client.query(`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$`)
    await client.query(`DO $$ BEGIN CREATE TYPE draw_status AS ENUM ('upcoming', 'live', 'ended'); EXCEPTION WHEN duplicate_object THEN null; END $$`)
    await client.query(`DO $$ BEGIN CREATE TYPE deposit_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$`)
    await client.query(`DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('bkash', 'nagad', 'rocket'); EXCEPTION WHEN duplicate_object THEN null; END $$`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        balance INTEGER NOT NULL DEFAULT 0,
        total_deposited INTEGER NOT NULL DEFAULT 0,
        total_won INTEGER NOT NULL DEFAULT 0,
        tickets_bought INTEGER NOT NULL DEFAULT 0,
        is_flagged BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS draws (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        jackpot INTEGER NOT NULL,
        ticket_price INTEGER NOT NULL,
        max_tickets INTEGER NOT NULL,
        tickets_sold INTEGER NOT NULL DEFAULT 0,
        status draw_status NOT NULL DEFAULT 'upcoming',
        end_date TIMESTAMP NOT NULL,
        winner_id UUID,
        winner_name TEXT,
        winner_ticket TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_ref TEXT NOT NULL,
        draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        claim_code TEXT NOT NULL DEFAULT '',
        is_winner BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        method payment_method NOT NULL,
        sender_phone TEXT NOT NULL,
        trx_id TEXT NOT NULL,
        status deposit_status NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        fraud_score INTEGER NOT NULL DEFAULT 0,
        fraud_flags TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bkash_number TEXT NOT NULL DEFAULT '',
        nagad_number TEXT NOT NULL DEFAULT '',
        rocket_number TEXT NOT NULL DEFAULT '',
        whatsapp_number TEXT NOT NULL DEFAULT '',
        payment_number TEXT NOT NULL DEFAULT ''
      )
    `)

    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS claim_code TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_number TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS draw_number INTEGER`)

    await client.query(`
      UPDATE draws SET draw_number = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM draws WHERE draw_number IS NULL
      ) sub
      WHERE draws.id = sub.id
    `)

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_draw_id_draws_id_fk;
      EXCEPTION WHEN OTHERS THEN null; END $$
    `)

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_ref_unique;
      EXCEPTION WHEN OTHERS THEN null; END $$
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tickets_draw_ticket_unique ON tickets(draw_id, ticket_ref)
    `)

    await client.query(`
      UPDATE tickets SET claim_code = upper(substring(md5(id::text || draw_id::text), 1, 13))
      WHERE claim_code = '' OR claim_code IS NULL
    `)

    console.log('[migrate] All migrations applied successfully')
  } catch (err) {
    console.error('[migrate] Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}
