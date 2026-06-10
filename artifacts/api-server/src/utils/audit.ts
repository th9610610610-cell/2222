import { db } from '@workspace/db'
import { auditLogsTable } from '@workspace/db'

export interface AuditEntry {
  actor_id?: string | null
  actor_role?: string | null
  action: string
  target_type?: string | null
  target_id?: string | null
  detail?: string | null
  ip_address?: string | null
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? null,
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      detail: entry.detail ?? null,
      ip_address: entry.ip_address ?? null,
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
