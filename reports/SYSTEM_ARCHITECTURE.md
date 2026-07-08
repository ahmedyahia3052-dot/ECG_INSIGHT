# System Architecture

## Overview
ECG Insight is a multi-tenant clinical ECG platform with an Expo/React frontend, an Express/TypeScript API, PostgreSQL persistence through Prisma, and production deployment through Docker.

## Runtime Components
- Frontend: Expo Router React Native web/mobile app under `artifacts/ecg-insight`.
- API: Express server under `server/src`, mounted behind `/api`.
- Database: PostgreSQL managed through Prisma schema and migrations.
- Realtime: Socket.IO initialized from the HTTP server.
- Reverse proxy: Nginx forwards API, health, readiness, liveness, and metrics traffic.
- File storage: API-managed uploads volume for ECG files, documents, signatures, and report artifacts.

## Request Flow
1. Client sends HTTPS request to Nginx or the platform load balancer.
2. Proxy forwards `X-Request-ID`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
3. Express assigns or preserves the request ID.
4. Security middleware applies Helmet, CORS, cookie parsing, JSON limits, and rate limiting.
5. Auth middleware validates JWT/session context for protected API modules.
6. Route handlers perform DTO validation, object-level authorization, business logic, audit logging, and persistence.
7. Observability middleware emits structured JSON request logs.

## Core Domains
- Authentication and RBAC: JWT access tokens, refresh-token cookies, sessions, impersonation, and roles.
- Clinical workflows: patients, ECG cases, ECG files, AI analysis, reports, documents, and timeline events.
- Enterprise records: organizations, departments, contractors, employees, occupational risk, fitness assessments, and restrictions.
- Collaboration: tasks, teams, secure messages, alerts, notifications, and realtime events.
- Compliance and security: audit logs, consent/data request workflows, session tracking, security events, and metrics.

## Health Model
- `/liveness`: process is running.
- `/readiness`: environment and database dependency are ready.
- `/health`: service metadata, environment, timestamp, uptime, and request ID.
- `/metrics`: in-process request and error counters.

## Deployment Model
- `Dockerfile.production` builds a production API image.
- `Dockerfile.frontend.production` builds and serves the Expo web frontend with Nginx.
- `docker-compose.production.yml` runs PostgreSQL, API, frontend, and Nginx with health checks.
- `scripts/start-production.sh` validates production environment, applies migrations, optionally seeds, and starts the API.
- GitHub Actions validates build, lint, tests, migrations, seed, production validation, Docker build, and smoke tests.

## Data Protection
- PostgreSQL stores clinical records, authorization data, audit trails, timelines, and workflow entities.
- Upload volume stores clinical binary artifacts and must be backed up with database snapshots.
- Audit logs are persisted for clinical and administrative actions and complemented by centralized JSON runtime logs.

## Operational Boundaries
- Production secrets must be injected through environment management, not Git.
- HTTPS is required for production frontend and API origins.
- `TRUST_PROXY=true` is valid only behind trusted proxy infrastructure.
- External PACS/HL7/FHIR integrations require site-specific credentials and network allow-listing.
