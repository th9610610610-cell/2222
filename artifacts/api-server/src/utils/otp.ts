import { db } from '@workspace/db'
import { otpTokensTable } from '@workspace/db'
import { and, eq, gt, lt } from 'drizzle-orm'
import crypto from 'crypto'

export function generateOTP(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, '0')
}

export function hashDevice(userAgent: string, ip: string): string {
  return crypto.createHash('sha256').update(`${userAgent}|${ip}`).digest('hex').slice(0, 32)
}

export async function storeOTP(email: string, type: string, ip?: string): Promise<string> {
  await db.delete(otpTokensTable).where(
    and(eq(otpTokensTable.email, email.toLowerCase()), eq(otpTokensTable.type, type))
  )
  const code = generateOTP()
  const expires_at = new Date(Date.now() + 10 * 60 * 1000)
  await db.insert(otpTokensTable).values({ email: email.toLowerCase(), code, type, expires_at, ip_address: ip || null })
  return code
}

export async function verifyOTP(email: string, code: string, type: string): Promise<boolean> {
  const now = new Date()
  const [token] = await db.select().from(otpTokensTable).where(
    and(
      eq(otpTokensTable.email, email.toLowerCase()),
      eq(otpTokensTable.code, code.trim()),
      eq(otpTokensTable.type, type),
      eq(otpTokensTable.used, false),
      gt(otpTokensTable.expires_at, now),
    )
  )
  if (!token) return false
  await db.update(otpTokensTable).set({ used: true }).where(eq(otpTokensTable.id, token.id))
  return true
}

export async function cleanExpiredOTPs(): Promise<void> {
  await db.delete(otpTokensTable).where(lt(otpTokensTable.expires_at, new Date()))
}
