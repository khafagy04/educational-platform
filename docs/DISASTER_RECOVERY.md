# Disaster recovery runbook

## Recovery objectives

- Target RPO: 24 hours until managed continuous archiving is enabled.
- Target RTO: 4 hours for a documented single-VPS rebuild.
- Nightly PostgreSQL custom-format dumps are copied off-host and retained 30 days. Docker JSON logs rotate at 10 MB with five files per service.

## Nightly backup

Schedule `powershell -File ops/backup-postgres.ps1 -OutputDirectory D:\platform-backups` with Windows Task Scheduler (or the equivalent Linux `pg_dump -Fc`). Sync encrypted results to a different provider. Alert when no new file appears in 26 hours.

## Restore drill

Run `powershell -File ops/restore-drill.ps1 -BackupPath <absolute dump path>`. It creates only `educational_platform_restore_drill`, restores the dump, verifies user/course/order counts, and drops that drill database. Run monthly and record the output and elapsed time.

## Incident procedures

1. Database loss: stop backend writes, provision PostgreSQL 17, restore the newest verified dump, run Prisma migrations, compare row counts, then restore service.
2. VPS loss: provision from `compose.prod.yaml`, restore environment secrets from the password manager, restore PostgreSQL, attach R2, run health checks, then change DNS.
3. R2 loss/corruption: enable bucket versioning and a second-region replication/lifecycle policy in Cloudflare; restore the last clean object version and reconcile certificate/attachment keys from PostgreSQL.
4. Credential exposure: rotate JWT/refresh, SMTP, R2, Stream, Fawaterk, Redis, and database secrets; revoke active sessions; inspect audit and provider logs.

Real off-host scheduling, R2 versioning, and provider alerts require deployment credentials and are not claimed as locally verified.
