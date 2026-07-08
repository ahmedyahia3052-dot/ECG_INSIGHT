# Production Deployment Guide

This guide prepares ECG Insight for a Docker-based production deployment.

## Prerequisites
- Node.js 22 for CI/build hosts.
- Docker and Docker Compose v2 for container deployment.
- PostgreSQL 16 or a managed PostgreSQL service.
- HTTPS endpoint for the API and frontend.
- Secure production values for all variables in `.env.example`.

## Environment
Create `.env.production` on the deployment host. Required values:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ecg_insight
JWT_SECRET=<at least 32 random chars>
JWT_REFRESH_SECRET=<different 32+ random chars>
CLIENT_ORIGIN=https://app.example.com
EXPO_PUBLIC_API_URL=https://api.example.com/api
COOKIE_DOMAIN=.example.com
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=600
TRUST_PROXY=true
```

For `docker-compose.production.yml`, also provide `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` if using the bundled PostgreSQL container.

## Build
```bash
npm ci
npm run build
npm run lint
npm run test
npm run build:frontend
npm run validate:production
docker build -f Dockerfile.production -t ecg-insight-api:<version> .
docker build -f Dockerfile.frontend.production -t ecg-insight-frontend:<version> .
```

## Deploy With Docker Compose
```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

The API container runs:
- production environment validation,
- Prisma migrations with `prisma migrate deploy`,
- optional seed execution when `RUN_DB_SEED=true`,
- API startup checks against the database.

The frontend container exports the Expo web application and serves it through Nginx on the configured compose port.

## Health Verification
```bash
curl -fsS http://localhost:3001/liveness
curl -fsS http://localhost:3001/readiness
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:8080
PRODUCTION_BASE_URL=http://localhost:3001 npm run smoke:production
npm run release:candidate
RUN_LIVE_LOAD=true RELEASE_CANDIDATE_BASE_URL=http://localhost:3001 npm run release:load
```

## Security Configuration
- CORS is allow-list based through `CLIENT_ORIGIN`.
- Refresh cookies are `HttpOnly`, `Secure`, and `SameSite=None` in production.
- Helmet enables production security headers and HSTS.
- API rate limits are controlled by `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- `TRUST_PROXY=true` should only be used behind trusted infrastructure.

## Logging And Monitoring
The API emits JSON logs containing `timestamp`, `level`, `service`, `requestId`, `method`, `path`, `statusCode`, and `durationMs`. Route errors and uncaught exceptions are captured through the centralized logger. Set `EXCEPTION_MONITORING_DSN` when an external monitoring collector is available.

## Database Migrations And Seed
Run migrations before serving traffic:

```bash
npx prisma migrate deploy
```

Seed execution should be explicit:

```bash
RUN_DB_SEED=true docker compose -f docker-compose.production.yml --env-file .env.production up -d api
```

Do not seed production repeatedly unless the seed is idempotent and approved.

## Rollback
1. Stop traffic to the failed release.
2. Redeploy the previous Docker image digest.
3. Restore database only if the migration introduced incompatible data changes and a rollback migration is unavailable.
4. Run `/readiness` and `npm run smoke:production`.
5. Record the incident and release SHA in the operations log.

## Sprint 37 Release Candidate Gate

Before promoting a build to production, run the final release gate:

```bash
npm run build
npm run lint
npm run test
npm run release:candidate
npm run release:load
npx prisma migrate deploy
```

Then review `/api/release-candidate/dashboard` as an administrator. Launch requires:

- Release readiness score of at least 85.
- `GO` launch decision.
- No unresolved critical defects.
- Successful workflow validation for ECG reporting, occupational screening, collaboration, and subscription lifecycle.
- Verified backups, disaster recovery, logging, monitoring, alerting, migrations, and rollback procedures.
