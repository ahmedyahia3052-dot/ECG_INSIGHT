# 07 — Broken Imports Report

**Audit:** Sprint 69 | Read-only  
**Validation:** `npm run typecheck` executed 2026-07-08 — **12 TypeScript errors**

---

## Summary

| Area | Error Count | Severity |
|------|----------:|----------|
| Frontend (ecg-insight) | 11 | High |
| Server | 1+ (notification engine cluster) | High |
| Config | 1 (missing `lib/integrations/*`) | Medium |

**Build status:** `npm run build` blocked (depends on typecheck).

---

## Frontend Broken Imports / Type Errors

### 1. `ecg-live-monitor.tsx` — Resolver API Mismatch

| File | Error | Root Cause | Classification |
|------|-------|------------|----------------|
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | `candidateCases`, `demoCaseId`, `phase`, `refetch` not on resolver return type | Route expects fields removed/refactored from `useEcgWorkspaceCaseResolver` | **Broken** |

**Who references:** Live monitor route only.  
**Evidence:** TS2339 × 4 on lines 37–42.  
**Fix direction:** Align route with current resolver API or extend resolver.

---

### 2. `EcgExaminationWorkflowGate.tsx` — Missing Export

| File | Error | Root Cause |
|------|-------|------------|
| `artifacts/ecg-insight/components/ecg/viewer/EcgExaminationWorkflowGate.tsx` | `EcgWorkspaceResolvePhase` not exported from `useEcgWorkspaceCaseResolver` | Sprint 51 gate added; resolver export never added |

**Classification:** **Broken**  
**Impact:** Examination workflow gate may fail to compile; blocks build.

---

### 3. `EcgLiveMonitorGridShell.tsx` — Missing Token Export

| File | Error | Root Cause |
|------|-------|------------|
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorGridShell.tsx` | `LIVE_MONITOR_LAYOUT` not exported from `ecgLiveMonitorHmiTokens.ts` | Tokens renamed to `LIVE_MONITOR_SIDEBAR`; grid shell not updated |

**Properties missing:** `sidebarWidth`, `rightPanelWidth`, `gridGap`, `sidebarMinWidth`, `statusBarHeight`, `rightPanelMinWidth`, `bottomBarHeight`

**Classification:** **Broken** + **Unused** (zero importers)  
**Impact:** Low runtime (not wired); high cleanup value.

---

### 4. `EcgMonitorViewerFoundation.tsx` — Prop Drift

| File | Error | Details |
|------|-------|---------|
| `EcgMonitorViewerFoundation.tsx` | `coords` not valid on status/HUD child | Line ~637 |
| `EcgMonitorViewerFoundation.tsx` | `leadLayout` not on resizable workspace / canvas children | Lines ~672, ~688, ~719 |

**Classification:** **Broken**  
**Root cause:** Sprint 52+ component API changes not propagated to foundation.

---

### 5. `EcgViewModeSwitcher.tsx` — Invalid View Mode

| File | Error |
|------|-------|
| `EcgViewModeSwitcher.tsx` | `"monitor"` not assignable to `EcgWorkstationViewMode` |

**Classification:** **Broken**  
**Root cause:** Sprint 52 removed live monitor from workspace view modes; switcher not updated.

---

### 6. `clinical-workflow/engine.ts` — Type Overlap

| File | Error |
|------|-------|
| `clinical-workflow/engine.ts` | Comparison with `"monitor"` has no overlap with view mode union |

**Classification:** **Broken**  
**Related to:** View mode removal in Sprint 52.

---

## Server Broken Imports / Type Errors

### 7. `enterprise-notification-engine` (Sprint 66)

| File | Errors (reported) |
|------|-------------------|
| `notification-engine.service.ts` | `Cannot find name 'emitRealtime'` |
| Same module | Prisma `status.in` readonly tuple type mismatch |
| Same module | Missing `notification` relation on recipient model |

**Classification:** **Broken**  
**Impact:** Notification engine may not compile; CI typecheck failure.

---

## Config / Workspace Broken References

| Item | Issue | Classification |
|------|-------|----------------|
| `pnpm-workspace.yaml` → `lib/integrations/*` | Directory does not exist | **Broken** (config) |
| `lib/integrations/*` packages | Referenced but absent | **Review Required** |

---

## Broken Routes (Logical, Not Import)

| Route | Issue | Classification |
|-------|-------|----------------|
| `/ecg-live-monitor` | May fail at runtime if resolver mismatch not caught | **Review Required** |
| Legacy `/fhir/export` | Works but diverges from Sprint 68 interop | **Deprecated** (not broken) |

---

## Broken Exports (Barrel Pollution)

`artifacts/ecg-insight/components/ecg/viewer/index.ts` exports components with no downstream importers:

| Export | Status |
|--------|--------|
| `EcgViewerToolbar` | Export exists; no consumers |
| `EcgFloatingToolPalette` | Export exists; no consumers |
| `EcgRenderingEngineView` | Export exists; no consumers |
| `EcgLiveMonitorGridShell` | May be exported; not imported |

**Classification:** **Review Required** — not compile errors but misleading public API.

---

## ESLint vs TypeScript Gap

| Tool | Scope | Result |
|------|-------|--------|
| ESLint | `server/src`, parts of `artifacts/ecg-insight` | **PASS** |
| TypeScript | `server/` + `artifacts/ecg-insight` | **12 errors** |

`tests/`, `scripts/` not in typecheck scope — potential hidden errors.

---

## Priority Fix Order

| Priority | Item | Effort |
|----------|------|--------|
| P0 | `EcgExaminationWorkflowGate` + resolver alignment | Small |
| P0 | `ecg-live-monitor.tsx` resolver fields | Small |
| P0 | `enterprise-notification-engine` TS errors | Medium |
| P1 | `EcgMonitorViewerFoundation` prop drift | Medium |
| P1 | View mode `"monitor"` removal cleanup | Small |
| P2 | Delete or fix `EcgLiveMonitorGridShell` | Small |
| P2 | Fix `pnpm-workspace.yaml` integrations path | Trivial |

---

## Classification

| File | Status |
|------|--------|
| `ecg-live-monitor.tsx` | **Broken** |
| `EcgExaminationWorkflowGate.tsx` | **Broken** |
| `EcgLiveMonitorGridShell.tsx` | **Broken** + **Unused** |
| `EcgMonitorViewerFoundation.tsx` | **Broken** |
| `EcgViewModeSwitcher.tsx` | **Broken** |
| `clinical-workflow/engine.ts` | **Broken** |
| `notification-engine.service.ts` | **Broken** |
| `pnpm-workspace.yaml` (integrations) | **Broken** |

---

*Read-only. No fixes applied.*
