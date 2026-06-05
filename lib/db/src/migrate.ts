import pg from 'pg'
const { Pool } = pg

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') ? { rejectUnauthorized: false } : false })
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

    // Additive migrations — safe to run on existing databases
    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS claim_code TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_number TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS draw_number INTEGER`)

    // Assign draw numbers to existing draws that don't have one
    await client.query(`
      UPDATE draws SET draw_number = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM draws WHERE draw_number IS NULL
      ) sub
      WHERE draws.id = sub.id
    `)

    // Fix tickets foreign key to cascade on delete (if not already)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_draw_id_draws_id_fk;
      EXCEPTION WHEN OTHERS THEN null; END $$
    `)

    // Drop old global unique on ticket_ref so we can have per-draw uniqueness
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_ref_unique;
      EXCEPTION WHEN OTHERS THEN null; END $$
    `)

    // Add composite unique index (draw_id + ticket_ref)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tickets_draw_ticket_unique ON tickets(draw_id, ticket_ref)
    `)

    // Populate claim_code for existing tickets that don't have one
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
