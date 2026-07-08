# Dependency Repair Report — Sprint 72

**Mission:** Repair backend dependency graph (imports, exports, circular dependencies)  
**Scope:** Server backend only — **zero UI / Workspace / Live Monitor / Viewer changes**  
**Date:** 2026-07-08

---

## Executive Summary

Sprint 72 repaired two critical server-side circular import chains, extracted shared types into dedicated modules, and cleaned **35+ unused imports** across the backend. Server TypeScript and ESLint pass cleanly.

**Full monorepo typecheck remains blocked** by 12 frontend errors confined to **Live Monitor** and **Viewer Foundation** files. Per Global Enterprise Safety Policy and Sprint 72 FAIL-SAFE rules, those files were **not modified** — manual approval is required before touching them.

---

## Repairs Completed (Backend)

### 1. Circular Import: `middleware/error.ts` ↔ `api/standards/errors.ts`

| Before | After |
|--------|-------|
| `AppError` defined in `middleware/error.ts`; `api/standards/errors.ts` imported it back, while `error.ts` imported builders from `errors.ts` | `AppError` moved to `server/src/errors/app-error.ts`; both modules import from the leaf module |

**Files changed:**
- `server/src/errors/app-error.ts` *(new)*
- `server/src/middleware/error.ts` — re-exports `AppError` for backward compatibility
- `server/src/api/standards/errors.ts` — imports from `errors/app-error`

### 2. Circular Import: `ai/providers.ts` ↔ `ai/onnx-runtime.service.ts`

| Before | After |
|--------|-------|
| `AIProvider` interface lived in `providers.ts`; ONNX service imported the type from providers while providers imported ONNX implementation | `AIProvider` extracted to `server/src/ai/ai-provider.types.ts` |

**Files changed:**
- `server/src/ai/ai-provider.types.ts` *(new)*
- `server/src/ai/providers.ts` — re-exports type
- `server/src/ai/onnx-runtime.service.ts` — imports from types module

### 3. Unused / Duplicate Imports (Server)

Removed or prefixed unused imports and parameters across **28 server files**, including:

- `ai/ai.service.ts`, `llm/providers/openai.provider.ts`
- `modules/copilot/*` (routes, attachment pipeline, engine v2, extractors)
- `modules/documents/document-intelligence.service.ts`
- `modules/ecg-*` diagnostic/digitization/interpretation modules
- `modules/enterprise-*` notification, report, rules engines
- `modules/health/health.service.ts`, `modules/reports/reports.routes.ts`

### 4. Dependency Graph Tooling

- Added `scripts/sprint72-dependency-graph-scan.mjs` — static circular import scanner for `server/src`
- Added `scripts/sprint72-dependency-repair.{test,integration}.ts`

---

## Circular Import Scan Results

| Metric | Before Sprint 72 | After Sprint 72 |
|--------|------------------|-----------------|
| Total cycles (server/src) | 10 | 8 |
| Critical API/auth cycles | 1 | **0** |
| AI provider cycles | 1 | **0** |
| Copilot engine cycles | 8 | 8 (deferred) |

### Remaining Cycles (Copilot Module — Deferred)

All 8 remaining cycles are inside `server/src/modules/copilot/`:

1. `attachment-context-builder` ↔ `copilot-attachment-pipeline`
2. `copilot-attachment-pipeline` ↔ `attachment-validator` ↔ `attachment/types`
3. `engine/context-manager` ↔ `engine/types` ↔ `clinical-knowledge-router` (multiple paths through `conversation-manager`, `v2/conversation-intent`, `v2/medical-reasoning`)

**Why deferred:** Breaking these cycles requires restructuring the Copilot engine graph (type extraction across 6+ interconnected files). This is backend-only but high-risk refactor beyond import hygiene — documented for a dedicated Copilot dependency sprint with integration test coverage.

---

## FAIL-SAFE STOP — Frontend Dependency Errors

### Why Execution Stopped

Sprint 72 validation (`npm run typecheck`) reports **12 TypeScript errors** in files protected by Global Enterprise Safety Policy:

| File | Error | Classification |
|------|-------|----------------|
| `app/(protected)/ecg-live-monitor.tsx` | Resolver API mismatch (`candidateCases`, `demoCaseId`, `phase`, `refetch`) | **Live Monitor — BLOCKED** |
| `components/ecg/viewer/EcgExaminationWorkflowGate.tsx` | Missing export `EcgWorkspaceResolvePhase` | **Viewer — BLOCKED** |
| `components/ecg/viewer/EcgLiveMonitorGridShell.tsx` | Missing export `LIVE_MONITOR_LAYOUT` | **Live Monitor / Viewer — BLOCKED** |
| `components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | Prop drift (`coords`, `leadLayout`) | **Viewer Foundation — BLOCKED** |
| `components/ecg/viewer/EcgViewModeSwitcher.tsx` | Invalid view mode `"monitor"` | **Viewer — BLOCKED** |
| `components/ecg/viewer/clinical-workflow/engine.ts` | `"monitor"` not in view mode union | **Viewer — BLOCKED** |

### Manual Approval Required

To restore full `npm run typecheck`, a **Viewer / Live Monitor hotfix sprint** must be approved with explicit scope to modify:

- `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/*` (listed above)
- Possibly `useEcgWorkspaceCaseResolver.ts` and `ecgLiveMonitorHmiTokens.ts` for missing exports

**No automatic fixes were attempted** on these paths.

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| ESLint | `npm run lint` | **PASS** |
| Server typecheck | `npx tsc -p server/tsconfig.json --noEmit` | **PASS** |
| Server unused imports | `npx tsc -p server/tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters` | **PASS** |
| Full typecheck | `npm run typecheck` | **FAIL** — 12 frontend errors (blocked scope) |
| Dependency graph scan | `node scripts/sprint72-dependency-graph-scan.mjs` | **8 cycles** (copilot only) |
| Sprint 72 unit tests | `npx tsx scripts/sprint72-dependency-repair.test.ts` | **PASS** |
| Sprint 72 integration markers | `npx tsx scripts/sprint72-dependency-repair.integration.ts` | **PASS** |

---

## Files Changed

### New
- `server/src/errors/app-error.ts`
- `server/src/ai/ai-provider.types.ts`
- `scripts/sprint72-dependency-graph-scan.mjs`
- `scripts/sprint72-dependency-repair.test.ts`
- `scripts/sprint72-dependency-repair.integration.ts`
- `DEPENDENCY_REPAIR_REPORT.md`

### Modified (server backend only)
- `server/src/middleware/error.ts`
- `server/src/api/standards/errors.ts`
- `server/src/ai/providers.ts`
- `server/src/ai/onnx-runtime.service.ts`
- 28 additional server files (unused import cleanup)

### Not Modified (by policy)
- ECG Workspace, Live Monitor, Viewer Foundation, Rendering Engine, Canvas, Sidebar, Toolbar, React layout/components

---

## Recommendations

### P0 — Requires approved hotfix sprint
1. Align `ecg-live-monitor.tsx` with current `useEcgWorkspaceCaseResolver` API
2. Export `EcgWorkspaceResolvePhase` from resolver or update gate imports
3. Reconcile `LIVE_MONITOR_LAYOUT` vs `LIVE_MONITOR_SIDEBAR` token naming
4. Propagate component API changes to `EcgMonitorViewerFoundation.tsx`
5. Remove `"monitor"` from view mode switcher or restore to type union

### P1 — Backend follow-up
1. Copilot module type extraction sprint (break 8 remaining cycles)
2. Add `npm run deps:scan` script wrapping `sprint72-dependency-graph-scan.mjs`
3. Enable `@typescript-eslint/no-unused-vars` as warning in CI for `server/src`

---

## Hardening Summary

Sprint 72 eliminated the API-layer and AI-provider circular dependencies, centralized `AppError` and `AIProvider` types, and cleaned server import hygiene — all without touching clinical UI surfaces. Full monorepo typecheck restoration is blocked pending an approved Viewer/Live Monitor dependency alignment sprint.
