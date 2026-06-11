import crypto from 'crypto'

interface OtpEntry {
  otp: string
  expires: number
  purpose: string
  attempts: number
}

const store = new Map<string, OtpEntry>()

function makeKey(identifier: string, purpose: string) {
  return `${purpose}:${identifier}`
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

export function storeOtp(identifier: string, purpose: string, otp: string): void {
  const key = makeKey(identifier, purpose)
  store.set(key, {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
    purpose,
    attempts: 0,
  })
}

export function verifyOtp(identifier: string, purpose: string, otp: string): { valid: boolean; error?: string } {
  const key = makeKey(identifier, purpose)
  const entry = store.get(key)
  if (!entry) return { valid: false, error: 'OTP not found or already used' }
  if (Date.now() > entry.expires) {
    store.delete(key)
    return { valid: false, error: 'OTP has expired' }
  }
  entry.attempts++
  if (entry.attempts > 5) {
    store.delete(key)
    return { valid: false, error: 'Too many attempts. Request a new OTP.' }
  }
  if (entry.otp !== otp) return { valid: false, error: 'Invalid OTP' }
  store.delete(key)
  return { valid: true }
}

export function hasRecentOtp(identifier: string, purpose: string): boolean {
  const key = makeKey(identifier, purpose)
  const entry = store.get(key)
  if (!entry) return false
  if (Date.now() > entry.expires) { store.delete(key); return false }
  return true
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.expires) store.delete(key)
  }
}, 5 * 60 * 1000)
