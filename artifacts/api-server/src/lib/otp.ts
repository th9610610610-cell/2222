import crypto from 'crypto'
import { db, otpCodesTable } from '@workspace/db'
import { and, eq, gt, lt } from 'drizzle-orm'

const OTP_VALID_MS = 10 * 60 * 1000   // 10 minutes validity
const OTP_RESEND_MS = 2 * 60 * 1000   // 2 minutes cooldown before resend allowed
const MAX_ATTEMPTS = 5

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export async function storeOtp(identifier: string, purpose: string, otp: string): Promise<void> {
  // Delete any existing OTP for this identifier+purpose
  await db.delete(otpCodesTable).where(
    and(eq(otpCodesTable.identifier, identifier), eq(otpCodesTable.purpose, purpose))
  )
  await db.insert(otpCodesTable).values({
    identifier,
    purpose,
    otp_hash: hashOtp(otp),
    attempts: 0,
    sent_at: new Date(),
    expires_at: new Date(Date.now() + OTP_VALID_MS),
  })
}

export async function verifyOtp(
  identifier: string,
  purpose: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const [entry] = await db
    .select()
    .from(otpCodesTable)
    .where(and(eq(otpCodesTable.identifier, identifier), eq(otpCodesTable.purpose, purpose)))
    .limit(1)

  if (!entry) return { valid: false, error: 'OTP not found or already used' }
  if (new Date() > entry.expires_at) {
    await db.delete(otpCodesTable).where(eq(otpCodesTable.id, entry.id))
    return { valid: false, error: 'OTP has expired' }
  }

  const newAttempts = entry.attempts + 1
  if (newAttempts > MAX_ATTEMPTS) {
    await db.delete(otpCodesTable).where(eq(otpCodesTable.id, entry.id))
    return { valid: false, error: 'Too many attempts. Request a new OTP.' }
  }

  await db.update(otpCodesTable).set({ attempts: newAttempts }).where(eq(otpCodesTable.id, entry.id))

  if (hashOtp(otp) !== entry.otp_hash) return { valid: false, error: 'Invalid OTP' }

  await db.delete(otpCodesTable).where(eq(otpCodesTable.id, entry.id))
  return { valid: true }
}

export async function hasRecentOtp(identifier: string, purpose: string): Promise<boolean> {
  const cooldownCutoff = new Date(Date.now() - OTP_RESEND_MS)
  const [entry] = await db
    .select({ sent_at: otpCodesTable.sent_at, expires_at: otpCodesTable.expires_at })
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.identifier, identifier),
        eq(otpCodesTable.purpose, purpose),
        gt(otpCodesTable.expires_at, new Date())
      )
    )
    .limit(1)

  if (!entry) return false
  // Block resend only within 2-minute cooldown window
  return entry.sent_at > cooldownCutoff
}

// Note: expired OTPs are cleaned up per-request in verifyOtp above.
// setInterval is intentionally omitted — it does not work in serverless environments.
