import bcrypt from 'bcryptjs'
import { db, pool, usersTable } from '@workspace/db'
import { eq } from 'drizzle-orm'

const ADMIN_PHONE    = process.env.ADMIN_PHONE    ?? '01900000000'
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@lottowin.local'
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? 'Super Admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@1234'

async function main() {
  console.log('Seeding admin account…')

  const existing = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.phone, ADMIN_PHONE))

  if (existing.length > 0) {
    const user = existing[0]!
    if (user.role === 'admin') {
      console.log(`✓ Admin already exists (id: ${user.id}). Nothing to do.`)
    } else {
      await db
        .update(usersTable)
        .set({ role: 'admin', is_verified: true })
        .where(eq(usersTable.phone, ADMIN_PHONE))
      console.log(`✓ Promoted existing user ${user.id} to admin.`)
    }
    await pool.end()
    return
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const [user] = await db
    .insert(usersTable)
    .values({
      full_name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      password_hash,
      role: 'admin',
      is_verified: true,
    })
    .returning({ id: usersTable.id })

  console.log(`✓ Admin created (id: ${user!.id})`)
  console.log()
  console.log('  Phone:    ' + ADMIN_PHONE)
  console.log('  Password: ' + ADMIN_PASSWORD)
  console.log('  Email:    ' + ADMIN_EMAIL)
  console.log()
  console.log('Log in with phone + password above.')
  console.log('An OTP will be sent to the admin email — enter it to complete login.')

  await pool.end()
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
