# Disaster Recovery

## Recovery Objectives
- Target RPO: 24 hours with daily backups, lower when WAL archiving is enabled.
- Target RTO: 4 hours for single-region restoration once infrastructure access is available.

## Recovery Order
1. Provision PostgreSQL and application runtime infrastructure.
2. Restore the latest verified database backup.
3. Restore uploaded clinical files and generated report artifacts.
4. Deploy the Docker image matching the release commit SHA.
5. Apply pending migrations with `npx prisma migrate deploy`.
6. Start the API and verify `/liveness`, `/readiness`, and `/health`.
7. Run `npm run smoke:production`.
8. Validate representative clinical workflows with a privileged operator.

## Failover Checklist
- Confirm the primary environment is unavailable or unsafe.
- Freeze non-essential writes if partial access remains.
- Restore database and file storage to the recovery environment.
- Point DNS or load balancer traffic to the recovery endpoint.
- Validate CORS and cookie domains match the recovery hostname.
- Notify clinical and operations stakeholders.

## Post-Incident Actions
- Export incident timeline from centralized logs and audit logs.
- Compare backup timestamp against last successful write.
- Rotate credentials if compromise is suspected.
- Document clinical data reconciliation steps.
- Update this runbook after the incident review.
