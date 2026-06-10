import { db } from '@workspace/db'
import { adminAuditLogsTable, loginAuditLogsTable } from '@workspace/db/schema'

export async function logAdminAction(params: {
  admin_id: string
  action: string
  target_type: string
  target_id?: string
  detail?: string
  ip?: string
}) {
  try {
    await db.insert(adminAuditLogsTable).values(params)
  } catch (e) {
    console.error('[audit log error]', e)
  }
}

export async function logLogin(params: {
  user_id: string
  ip: string
  user_agent: string
  success: boolean
  reason?: string
}) {
  try {
    await db.insert(loginAuditLogsTable).values(params)
  } catch (e) {
    console.error('[login log error]', e)
  }
}
