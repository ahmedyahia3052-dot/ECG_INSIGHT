# Launch Checklist

## Release Candidate Gate

- [ ] Confirm final commit SHA and Docker image digests.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run release:candidate`.
- [ ] Run `npm run release:load`.
- [ ] Run `npx prisma migrate deploy` against staging.
- [ ] Review `/api/release-candidate/dashboard`.
- [ ] Confirm launch decision is `GO`.

## Production Readiness

- [ ] Validate `.env.production` with real non-placeholder secrets.
- [ ] Confirm HTTPS API and frontend origins.
- [ ] Confirm secure CORS allow list.
- [ ] Confirm database backups and restore procedure.
- [ ] Confirm disaster recovery runbook.
- [ ] Confirm observability dashboards and alert destinations.
- [ ] Confirm rollback image and rollback procedure.

## Clinical Safety

- [ ] Validate ECG upload and AI analysis workflow.
- [ ] Validate clinical review and report PDF export.
- [ ] Validate collaboration and final signature.
- [ ] Validate occupational decision workflows.
- [ ] Validate medical disclaimers and audit logging.

## Commercial Readiness

- [ ] Validate subscription plan access.
- [ ] Validate billing and payment workflows.
- [ ] Validate license and usage tracking.
- [ ] Validate admin financial dashboard.

## Security and Compliance

- [ ] Validate MFA enrollment and recovery-code flow.
- [ ] Validate trusted device revocation.
- [ ] Validate session force logout.
- [ ] Validate audit explorer.
- [ ] Validate GDPR export/delete workflows.
- [ ] Validate security alerts and risk score.

## Go/No-Go

- [ ] No critical or high unresolved defects.
- [ ] Release readiness score is at least 85.
- [ ] Operations, clinical, security, and product owners approve launch.
