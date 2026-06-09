import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '@workspace/db'
import { usersTable } from '@workspace/db'
import { eq } from 'drizzle-orm'

const router = Router()
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_SECRET = process.env.JWT_SECRET as string

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'

function generatePartnerCode(): string {
  let code = ''
  for (let i = 0; i < 7; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}

async function uniquePartnerCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generatePartnerCode()
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.partner_code, code))
    if (!existing.length) return code
  }
  throw new Error('Could not generate unique partner code')
}

const registerSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  password: z.string().min(6),
})

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, data.phone))
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Phone number already registered' })
    }
    const password_hash = await bcrypt.hash(data.password, 12)
    const partner_code = await uniquePartnerCode()
    const [user] = await db.insert(usersTable).values({
      full_name: data.full_name,
      phone: data.phone,
      password_hash,
      partner_code,
    }).returning({ id: usersTable.id, full_name: usersTable.full_name, phone: usersTable.phone, role: usersTable.role, partner_code: usersTable.partner_code })
    return res.status(201).json({ user })
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues[0]?.message || 'Validation error' })
    console.error('[register error]', err?.message || err)
    return res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' })

    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone))
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // Ensure user has a partner_code (backfill for old accounts)
    if (!user.partner_code) {
      try {
        const code = await uniquePartnerCode()
        await db.update(usersTable).set({ partner_code: code }).where(eq(usersTable.id, user.id))
        user.partner_code = code
      } catch (_) {}
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    const { password_hash: _, ...safeUser } = user
    return res.json({ token, user: safeUser })
  } catch (err: any) {
    console.error('[login error]', err?.message || err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

export default router
