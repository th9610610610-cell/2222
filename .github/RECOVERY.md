# Monitoring & Recovery Playbook

## Health Check

`GET /api/healthz` — returns `{ status: "ok", db: "ok", ts: "..." }`. Uptime monitors should poll this every 60 seconds. A `503` response means the DB is unreachable.

## Monitoring

| What | Tool | Alert threshold |
|------|------|-----------------|
| Server uptime | UptimeRobot / BetterUptime | Any downtime > 2 min |
| Error rate | Deployment logs | > 5 errors/min |
| Auth failures | `audit_logs` table | > 20 failed logins in 15 min for same IP |
| Flagged deposits | `deposits` table `fraud_score >= 70` | Immediate review |

## Database Backups

### Automatic Backups
- Replit managed databases include automatic daily backups.
- For production Supabase/Neon: enable Point-in-Time Recovery (PITR) from the dashboard.

### Manual Backup (run before major schema changes)
```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
```bash
psql "$DATABASE_URL" < backup_YYYYMMDD_HHMMSS.sql
```

## Running Migrations in Production

Use the protected `/api/migrate` endpoint — it requires `ADMIN_MIGRATE_KEY`:

```bash
curl -X POST https://your-domain.replit.app/api/migrate \
  -H "Content-Type: application/json" \
  -d '{ "key": "<ADMIN_MIGRATE_KEY>" }'
```

Never run migrations directly against the production DB without a backup.

## Incident Response

### High-severity (account takeover, data breach)
1. Immediately rotate `JWT_SECRET` (invalidates all active sessions)
2. Check `audit_logs` for the actor and affected `target_id`
3. Flag affected users via `PATCH /api/admin/users/:id` with `{ "is_flagged": true }`
4. Notify affected users via the notifications system
5. Post a status update and contact support@lottowin.app

### Lockout abuse (attacker triggering account lockouts)
1. Identify IP from `audit_logs` or nginx/proxy logs
2. Block IP at the infrastructure level
3. Manually unlock the victim's account:
   ```sql
   UPDATE users SET login_attempts = 0, lockout_until = NULL WHERE email = '...';
   ```

### Compromised admin account
1. Remove admin role immediately:
   ```sql
   UPDATE users SET role = 'user' WHERE id = '...';
   ```
2. Check `audit_logs` for all actions by that `actor_id` in the last 30 days
3. Rotate `JWT_SECRET` to invalidate all tokens

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs all user tokens — rotate to force logout |
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_MIGRATE_KEY` | Required to call `/api/migrate` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email for OTP delivery |
| `ALLOWED_ORIGIN` | Explicit CORS origin for production domain |

## Checklist Before Each Deploy

- [ ] Backup production DB
- [ ] Run `pnpm audit --audit-level=high` — no new high/critical issues
- [ ] Test `/api/healthz` returns `200` after deploy
- [ ] Verify migrations ran via `[migrate] All migrations applied successfully` in server logs
