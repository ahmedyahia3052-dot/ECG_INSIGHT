# Release Checklist

Use this checklist before promoting ECG Insight to production.

## Code And Validation
- [ ] `npm ci` completed on a clean checkout.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build:frontend` passes for the Expo web build.
- [ ] `npm run validate:production` passes with production environment values.
- [ ] Prisma migrations are reviewed and ordered.
- [ ] `npx prisma migrate deploy` succeeds against the release database.
- [ ] Seed execution is intentional and controlled with `RUN_DB_SEED=true` only when required.

## Security
- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` use production secrets.
- [ ] `CLIENT_ORIGIN` contains only approved HTTPS origins.
- [ ] `EXPO_PUBLIC_API_URL` uses the production HTTPS API URL.
- [ ] `COOKIE_DOMAIN` matches the deployed domain when cross-subdomain cookies are used.
- [ ] `TRUST_PROXY=true` only behind a trusted load balancer or reverse proxy.
- [ ] Rate limits are configured through `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
- [ ] Production `.env` files are not committed to Git.

## Infrastructure
- [ ] `docker build -f Dockerfile.production -t ecg-insight-api:<version> .` succeeds.
- [ ] `docker compose -f docker-compose.production.yml config` succeeds.
- [ ] Postgres persistent volume or managed database backup is enabled.
- [ ] API upload volume or object storage backup is enabled.
- [ ] Nginx or load balancer forwards `X-Request-ID`, `X-Forwarded-For`, and `X-Forwarded-Proto`.

## Runtime Checks
- [ ] `/liveness` returns 200.
- [ ] `/readiness` returns 200 and reports database ready.
- [ ] `/health` returns 200 with service metadata.
- [ ] `npm run smoke:production` passes against the deployed base URL.
- [ ] Centralized logs include `requestId`, method, path, status, and duration.
- [ ] Global exception monitoring destination is configured where available.

## Operations
- [ ] Backup strategy has an owner and schedule.
- [ ] Disaster recovery runbook has been reviewed.
- [ ] Restore verification date is recorded.
- [ ] Release commit SHA and Docker image digest are recorded.
- [ ] Rollback plan is approved.
