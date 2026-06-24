# Backup Strategy

ECG Insight production data is centered on PostgreSQL plus uploaded clinical files in the API uploads volume. Backups must protect both stores.

## Scope
- PostgreSQL database: clinical records, audit logs, users, reports, tasks, messages, notifications, and configuration.
- Upload storage: ECG files, clinical documents, signatures, generated reports, and derived artifacts.
- Deployment configuration: `.env.production`, Docker image digest, migration version, and release commit SHA.

## Schedule
- Database full backup: daily.
- Database point-in-time recovery: enable WAL archiving where supported by the managed database provider.
- Upload volume snapshot: daily, aligned with the database full backup window.
- Configuration escrow: after every production release.

## Retention
- Daily backups: 35 days.
- Monthly backups: 12 months.
- Annual compliance archive: 7 years where required by hospital policy.

## Verification
- Run restore verification at least monthly in an isolated environment.
- Confirm `/readiness` passes after restore.
- Run `npm run smoke:production` against the restored environment.
- Verify audit log continuity for restored clinical actions.

## Security
- Encrypt backups at rest.
- Restrict backup access to production operators only.
- Store database and file backups in separate failure domains.
- Never commit backup credentials or production `.env` files to Git.
