# Sprint 36 Security Hardening Report

## Executive Summary

Sprint 36 transforms ECG Insight into a hardened enterprise medical platform with stronger authentication controls, API protections, field-level PHI encryption support, compliance workflows, immutable auditability, and a mobile-first Security Center.

## Enterprise Authentication Hardening

- MFA now supports TOTP authenticator setup, verification, backup recovery codes, recovery-code regeneration, and recovery-code audit logging.
- Trusted devices include fingerprinting, trust state, IP/user-agent metadata, revocation timestamps, and revocation audit events.
- Session controls include refresh token rotation, refresh token reuse detection, timeout enforcement, concurrent session pruning, single-session revoke, and force logout all sessions.
- Password security includes strong complexity rules, 90-day expiration, lockout after repeated failures, failed-login audit records, and prevention of recent password reuse.

## API Security

- Global rate limiting remains enforced through `express-rate-limit`.
- New API security middleware adds in-process per-IP and per-user throttling.
- Request signature validation supports HMAC signatures using method, URL, timestamp, and body digest.
- Cookie-authenticated mutation requests support CSRF validation through `ecg_csrf_token` and `x-csrf-token`.
- Suspicious request signature, CSRF, and throttle failures create SIEM-ready `SecurityEvent` records.
- Secure CORS and production HTTPS-origin validation remain enforced through environment validation and app bootstrap.

## Data Protection

- Added AES-256-GCM field-level encryption utilities for PHI values.
- Added PHI encryption inventory records for National ID, Passport, Employee ID, medical history, clinical notes, and contact details.
- Added key rotation event tracking with key version metadata and audit logging.
- Existing signed URL support remains available through `/api/security/file/signed-url`.
- Environment validation continues to reject placeholder secrets and non-HTTPS production URLs.

## Compliance Platform

- Consent management supports treatment, data processing, occupational health, research, and sharing consent.
- GDPR data export endpoint returns patient, case, consent, request, and audit history bundles.
- Data request completion records `DATA_EXPORTED` or `DATA_DELETED` audit actions.
- Retention policies are modeled as enterprise `SecurityPolicy` records.
- Occupational privacy is supported through organization-scoped consent, request, audit, and policy records.

## Enterprise Audit Trail

Audit coverage now includes login, logout, failed login, session revocation, MFA recovery code use, trusted device revocation, security policy updates, PHI encryption registration, key rotation, GDPR export/delete, report viewing/editing/download actions, ECG upload, AI analysis, and permission changes.

Each audit record includes user, timestamp, IP, user agent/device context, action, entity, metadata, and previous/new value fields where applicable.

## Security Monitoring

- `/api/security/monitoring/summary` exposes security posture metrics.
- Risk scoring combines open critical events, failed logins, and suspicious events.
- Security events are structured for SIEM ingestion with type, severity, status, IP, user agent, metadata, and timestamp.
- Intrusion detection hooks are represented by middleware-generated security events for throttle, CSRF, and request-signature failures.

## Frontend

The mobile-first Security Center now includes:

- Security Center Dashboard
- Active Sessions Page
- Trusted Devices Page
- MFA Settings
- Consent Management
- Audit Explorer
- Security Alerts Panel

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260626203000_sprint36_security_hardening/migration.sql`
- `server/src/auth/auth.service.ts`
- `server/src/middleware/api-security.ts`
- `server/src/modules/security/security.routes.ts`
- `server/src/modules/compliance/compliance.routes.ts`
- `server/src/utils/security-crypto.ts`
- `artifacts/ecg-insight/app/(tabs)/security-dashboard.tsx`
- `artifacts/ecg-insight/components/security/SecurityListScreen.tsx`
- `scripts/sprint36-security-hardening.integration.ts`

## Validation

Required validation:

- `npm run build`
- `npm run lint`
- `npm run test`
