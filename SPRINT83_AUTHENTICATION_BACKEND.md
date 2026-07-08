# Sprint 83 — Authentication Backend Report

**Date:** 2026-07-09  
**Mode:** Production — continues Sprint 82  
**Contract version:** `sprint83-v1`  
**Status:** Complete

---

## Executive Summary

Sprint 83 delivers a production-ready **authentication backend** using Clean Architecture: repository pattern, service layer, DTO validation, JWT access/refresh with rotation, Argon2 password hashing, email verification, password reset, session management, and RBAC for enterprise roles.

**No ECG Viewer or frontend UI files were modified.**

| Gate | Result |
|------|--------|
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** (server + ecg-insight) |
| `npm run build` | **PASS** |
| Unit tests (`tests/unit/server/authentication/*`) | **PASS** — 9/9 |
| `sprint83-authentication.integration.ts` | **PASS** |

---

## Architecture

```
server/src/modules/authentication/     ← Sprint 83 Clean Architecture module
├── domain/                            ← Roles, constants
├── dto/                               ← Zod schema re-exports
├── repository/                        ← Session + User auth persistence
├── service/                           ← Password, token, session, auth orchestration
├── openapi.ts                         ← OpenAPI contract markers
└── index.ts

server/src/auth/                       ← Existing HTTP routes (unchanged paths)
├── auth.routes.ts                     ← Thin controllers + DTO validation
└── auth.service.ts                    ← Facade delegating to authentication module
```

### Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **DTO** | Zod validation via existing `auth/schemas.ts` + extended role enum |
| **Repository** | `UserAuthRepository`, `SessionRepository` — Prisma isolation |
| **Service** | `AuthenticationService`, `SessionService`, `PasswordService`, `TokenService` |
| **Routes** | Existing `/api/auth/*` endpoints — zero breaking URL changes |

---

## Features Implemented

| Feature | Implementation |
|---------|----------------|
| JWT access token | 15-minute TTL via `TokenService` / `utils/jwt.ts` |
| JWT refresh token | HttpOnly cookie `ecg_refresh_token` |
| Refresh token rotation | New session row per refresh; `replacedById` chain; `tokenVersion` increment |
| Reuse detection | Hash + version mismatch → revoke all user sessions |
| Secure logout | Revoke session + clear cookies + audit log |
| Logout all | Revoke all sessions for user |
| Password hashing | Argon2id primary (`utils/crypto.ts`) |
| Email verification | Opaque token, hashed storage, verify/resend endpoints |
| Forgot / reset password | 30-minute reset token; revokes all sessions on reset |
| Session management | `Session` + `UserSession`; max 5 concurrent enterprise sessions |
| RBAC | `ROLE_RANK` hierarchy with Sprint 83 roles |

---

## Enterprise Roles (Sprint 83)

| Role | Prisma enum | API role |
|------|-------------|----------|
| Super Admin | `SUPER_ADMIN`, `OWNER` | `super_admin` |
| Organization Admin | `ORGANIZATION_ADMIN` | `organization_admin` |
| Doctor | `DOCTOR` | `doctor` |
| Technician | `TECHNICIAN` | `technician` |
| Student | `STUDENT` | `student` |

Registration accepts `organization_admin` and `technician` in addition to existing roles.

---

## Database Changes

Migration: `prisma/migrations/20260709020000_sprint83_authentication_backend/migration.sql`

- `Role` enum: `ORGANIZATION_ADMIN`, `TECHNICIAN`
- `Session.tokenVersion` for refresh rotation tracking
- Index on `Session.replacedById`

---

## API Endpoints (unchanged paths)

All existing `/api/auth/*` routes remain stable:

- `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`
- `POST /auth/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`
- `POST /auth/change-password`
- Phone OTP, OAuth, owner setup (preserved)

OpenAPI markers: `server/src/modules/authentication/openapi.ts`

---

## Tests

### Unit tests

| File | Coverage |
|------|----------|
| `tests/unit/server/authentication/roles.test.ts` | Role mapping, RBAC ranks |
| `tests/unit/server/authentication/password.service.test.ts` | Argon2 hashing, policy |
| `tests/unit/server/authentication/token.service.test.ts` | JWT issue/parse, tokenVersion |

### Integration tests

| Script | Coverage |
|--------|----------|
| `scripts/sprint83-authentication.integration.ts` | Module structure, rotation, migration, facade wiring |
| `scripts/auth-session-hardening.integration.ts` | Refresh rotation, logout (existing) |
| `scripts/enterprise-auth.integration.ts` | Full auth flows (existing) |

---

## Usage (internal)

```typescript
import { authenticationService, sessionRepository } from "./modules/authentication";

// Login flow is HTTP-driven; services available for internal orchestration:
await authenticationService.login({ email, password, rememberMe }, req, res);
await authenticationService.refresh(req, res);
```

---

## Files Added

```
server/src/modules/authentication/
├── version.ts
├── index.ts
├── openapi.ts
├── domain/constants.ts
├── domain/roles.ts
├── dto/auth.dto.ts
├── repository/session.repository.ts
├── repository/user-auth.repository.ts
├── service/authentication.service.ts
├── service/session.service.ts
├── service/password.service.ts
├── service/token.service.ts
└── service/cookie.service.ts

tests/unit/server/authentication/
├── roles.test.ts
├── password.service.test.ts
└── token.service.test.ts

scripts/sprint83-authentication.integration.ts
prisma/migrations/20260709020000_sprint83_authentication_backend/
```

## Files Modified

| File | Change |
|------|--------|
| `server/src/auth/auth.service.ts` | Thin facade → authentication module |
| `server/src/middleware/auth.ts` | Shared `ROLE_RANK` from module |
| `server/src/utils/users.ts` | Extended API role mapping |
| `server/src/auth/schemas.ts` | `organization_admin`, `technician` registration roles |
| `server/src/users/schemas.ts` | Internal user role enum extended |
| `prisma/schema.prisma` | Roles + `Session.tokenVersion` |

---

## Validation Log

```
npm run lint          → exit 0
npm run typecheck     → exit 0
npm run build         → exit 0
vitest authentication → 9/9 PASS
sprint83 integration  → PASS
```

---

**Sprint 83 Authentication Backend — production-ready.**
