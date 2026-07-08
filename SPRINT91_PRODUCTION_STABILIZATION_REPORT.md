# Sprint 91 — Production Stabilization Report

**Date:** 2026-07-09  
**Mode:** Production stabilization (post Sprint 90)

## Summary

Sprint 91 stabilizes the ECG Insight platform for production development. All validation gates pass, migrations are applied, backend and frontend start cleanly, and core API/auth flows are verified.

## Fixes Applied

### Prisma migrations
- Fixed `20260709000000_sprint80_database_foundation` to null orphaned `createdById` / `updatedById` references before adding FK constraints (prevents `Patient_createdById_fkey` violation on existing databases).
- Resolved failed migration state and applied pending migrations (Sprints 82–89).

### Developer experience
- Added `npm run start:dev` alias → `node scripts/start-api-dev.mjs`.

## Validation Results

| Check | Status |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm install` | PASS |
| `npx prisma migrate deploy` | PASS |
| `npx prisma generate` | PASS |
| Backend startup (`npm run dev:api` / `start:dev`) | PASS |
| Frontend startup (`npm run dev:frontend`) | PASS |
| Production smoke (`scripts/production-smoke.ts`) | PASS |
| Sprint 91 smoke (`scripts/sprint91-production-stabilization.smoke.ts`) | PASS |

## Runtime URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:8081 |
| **Login** | http://localhost:8081/login |
| **Backend API** | http://localhost:3002/api |
| **Liveness** | http://localhost:3002/liveness |
| **Swagger** | http://localhost:3002/api/docs |

## Verified Flows

- Database connected (PostgreSQL `ecg_insight`)
- JWT login (`doctor@ecginsight.com` / `password`)
- Protected routes (`/auth/me`, `/cases`, `/patients`)
- Clinical case management module reachable
- Swagger documentation served

## Start Commands

```bash
npm install
npm run dev          # Full stack (API + frontend)
npm run start:dev    # Backend only
npm run dev:frontend # Frontend only
```

## Test Credentials (seed)

| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor@ecginsight.com | password |
| Admin | admin@ecginsight.com | password |
| Super Admin | super@ecginsight.com | password |

## Out of Scope

- Sprint 92 feature development (blocked until this sprint checklist complete)
