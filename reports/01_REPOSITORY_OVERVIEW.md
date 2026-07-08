# 01 — Repository Overview

**Project:** ECG Insight Enterprise  
**Audit:** Sprint 69 — Enterprise Repository Audit  
**Mode:** Read-only analysis  
**Date:** 2026-07-08  
**Branch context:** `backup-before-restore` (observed at audit time)

---

## Executive Snapshot

ECG Insight Enterprise is a **clinical ECG platform** combining an Expo/React Native Web frontend, a Node/Express + Prisma API, PostgreSQL, Playwright/Vitest QA, and optional Python ML (`ai-engine/`). The repository has grown through **50+ sprint cycles**, producing a feature-rich but architecturally layered codebase with significant documentation and generated-artifact sprawl.

| Metric | Value |
|--------|------:|
| Source `.ts` files (excl. generated) | ~951 |
| Source `.tsx` files (excl. generated) | ~238 |
| Server feature modules | 49 |
| Prisma models | 171 |
| Prisma migrations | 63 |
| Playwright e2e specs | ~105 |
| Vitest unit test files | ~45 |
| Integration scripts | ~134–145 |
| Root sprint/report `.md` files | 288 |
| Root run `.log` files | 26 |
| TypeScript errors (`npm run typecheck`) | **12** |
| ESLint (`npm run lint`) | **PASS** (scoped) |

---

## Product Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│  artifacts/ecg-insight (Expo Router — Primary UI)               │
│  Routes: /ecg-workspace, /ecg-live-monitor, /clinical-workspace │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST /api/v1
┌────────────────────────────▼────────────────────────────────────┐
│  server/ (Express + Prisma — Primary API)                       │
│  49 modules: ECG pipeline, clinical intelligence, enterprise    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  prisma/ — PostgreSQL schema (171 models)                       │
└─────────────────────────────────────────────────────────────────┘

Secondary (partially isolated):
  • artifacts/api-server + lib/db — Drizzle alternate API
  • enterprise/emkp — isolated knowledge platform
  • ai-engine/ — Python ML sidecar
  • mobile/ — future native stub (5 files)
```

---

## Monorepo Layout

| Package | Path | Role | Status |
|---------|------|------|--------|
| `workspace` | `/` | Root orchestrator (npm) | **KEEP** |
| `@workspace/ecg-insight` | `artifacts/ecg-insight/` | Production frontend | **KEEP** |
| *(no package.json)* | `server/` | Production API | **KEEP** |
| `@workspace/api-server` | `artifacts/api-server/` | Drizzle API | **Review Required** |
| `@workspace/db` | `lib/db/` | Drizzle schema | **Review Required** |
| `@workspace/scripts` | `scripts/` | QA/integration runners | **KEEP** |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox/` | UI sandbox | **KEEP (Future)** |
| `enterprise/emkp` | `enterprise/emkp/` | Knowledge platform | **Deprecated** (isolated) |

**Tension:** npm at root (`package-lock.json`, CI uses `npm ci`) vs pnpm workspace (`pnpm-workspace.yaml`, `workspace:*` refs). `lib/integrations/*` declared in pnpm workspace but **missing on disk**.

---

## Primary User Journeys

| Journey | Route | Core Components |
|---------|-------|-----------------|
| Enterprise workspace | `/ecg-workspace` | `EcgEnterpriseWorkspaceScreen` → `EcgMonitorViewerFoundation` |
| Live monitor | `/ecg-live-monitor` | `EcgLiveMonitorWorkspaceScreen` → `EcgLiveMonitorShell` |
| Case management | `/ecg-cases/[id]`, `/case` | Cases API + examination workflow |
| Reports | `/reports` | Reports + enterprise-report-engine |
| Copilot | `/copilot` | Copilot module + AI overlay |

---

## CI / DevOps

| Asset | Path | Notes |
|-------|------|-------|
| Enterprise QA | `.github/workflows/enterprise-qa.yml` | lint, typecheck, build, unit, integration, Playwright |
| Production | `.github/workflows/production.yml` | Postgres service, Docker build |
| Docker | 5 Dockerfiles + 2 compose files | API, frontend, AI engine |
| Dev stack | `scripts/infrastructure/` | Managed API + frontend for Playwright |

---

## Repository Health Signals

| Signal | Status | Classification |
|--------|--------|----------------|
| Lint (scoped) | Pass | **KEEP** |
| Typecheck | 12 errors | **Broken** |
| Build | Blocked by typecheck | **Broken** |
| Dual ORM (Prisma + Drizzle) | Coexists | **Review Required** |
| Zod v3/v4 split | Catalog vs root | **Review Required** |
| Sprint report sprawl | 288 root `.md` | **Review Required** |
| Generated runtime data | `uploads/` ~7.9k files | **Unsafe To Delete** |
| Local cache | `.local/` ~58k files | **Safe To Delete** (local only, gitignore) |

---

## Classification Summary (Repository-Wide)

| Classification | Approx. Count | Notes |
|----------------|---------------:|-------|
| **KEEP** | ~1,100 source files | Active production paths |
| **KEEP (Future)** | ~50 files | mobile/, mockup-sandbox, partial sprint modules |
| **Deprecated** | ~15 modules/files | Legacy adapters, copilot shims, EMKP |
| **Duplicate** | ~25+ clusters | Engines, shells, routes, docs |
| **Broken** | ~12 TS errors / 8 files | Typecheck failures |
| **Unused** | ~14+ TS/TSX orphans | Zero import graph |
| **Review Required** | ~350+ items | Sprint reports, logs, partial integrations |
| **Safe To Delete** | ~400–600 items | Logs, duplicates docs, orphans (see report 12) |
| **Unsafe To Delete** | `uploads/`, `prisma/migrations`, active modules | Runtime/clinical data |
| **Unknown** | EMKP integration intent, GridShell future | Needs product decision |

---

## Key Findings (Top 10)

1. **Dual backend stacks** — Prisma `server/` (production) vs Drizzle `artifacts/api-server/` (legacy/alternate).
2. **Multi-generation ECG UI** — workspace viewer, live monitor overlay, unused grid/reading-station layouts.
3. **Layered server engines** — measurement, interpretation, diagnostic, timeline, CDSS each have legacy + enterprise variants.
4. **Typecheck regression** — 12 errors from partial Sprint 52–68 integration (resolver, grid shell, foundation props).
5. **288 root sprint reports** — documentation debt dominating repo root.
6. **Fragmented testing** — Vitest + custom tsx runner + 145 sequential integration scripts + Playwright.
7. **171 Prisma models** — schema breadth exceeds active server surface area.
8. **Frontend/API version drift** — Sprint 65–68 APIs exist server-side; frontend still calls legacy `/fhir`, `/cdss`.
9. **Four knowledge catalogs** — overlapping diagnosis content across modules.
10. **Hybrid package managers** — npm + pnpm without unified workspace for `server/`.

---

*Read-only audit. No code modified. Await explicit approval before any cleanup.*
