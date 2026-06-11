import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '@workspace/db'
import { usersTable } from '@workspace/db'
import { eq } from 'drizzle-orm'

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const JWT_SECRET = process.env.JWT_SECRET as string

export interface AuthRequest extends Request {
  user?: typeof usersTable.$inferSelect
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string; role: string }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id))
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}
