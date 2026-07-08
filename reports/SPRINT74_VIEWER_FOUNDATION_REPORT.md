# Sprint 74 — Live ECG Foundation Stabilization Report

**Date:** 2026-07-08  
**Mode:** Zero regression  
**Contract version:** `sprint74-v1`

---

## Executive Summary

Sprint 74 unified viewer foundation contracts across the ECG workstation, live monitor, and rendering engines without modifying canvas, waveform, or monitor engine runtime logic. A single canonical module now owns lead definitions, grid adapters, and layout bridges.

| Gate | Result |
|------|--------|
| `npm run typecheck` | **PASS** (0 errors) |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| Unit tests (`qa:unit`) | **38/39 PASS** (1 pre-existing failure — see below) |

**No new TypeScript errors introduced.**

---

## Goals Completed

| Goal | Status |
|------|--------|
| Audit viewer foundation stack | ✅ |
| Unify lead definitions | ✅ `STANDARD_ECG_LEADS` / `EcgLeadId` remain canonical in `types.ts` |
| Unify grid settings | ✅ `EcgViewerGridSettings` → clinical/hospital adapters |
| Unify monitor layout contracts | ✅ `MonitorLayoutMode` derived from shared `EcgLeadLayoutMode` subset |
| Merge viewer contracts | ✅ `viewerFoundationContracts.ts` |
| Remove duplicate grid interface | ✅ `EcgRenderGridSettings` is now `Pick<EcgViewerGridSettings, …>` |
| Remove dead barrel exports | ✅ 4 orphan exports removed from `index.ts` |
| Verify no broken imports | ✅ Typecheck clean |
| No circular references | ✅ Contracts import types/monitorLayout/render-engine types only |

---

## Files Created

### `viewerFoundationContracts.ts`

Canonical Sprint 74 contract surface:

| Export | Purpose |
|--------|---------|
| `STANDARD_ECG_LEADS`, `EcgLeadId`, `DEFAULT_GRID` | Single lead + grid source |
| `SharedLeadLayoutMode` | Overlap between workstation and monitor |
| `MonitorExclusiveLayoutMode` | Monitor-only layouts (dual, quad, N-lead, custom) |
| `toClinicalRenderGrid()` | `EcgViewerGridSettings` → `EcgRenderGridSettings` |
| `toHospitalRenderGrid()` | `EcgViewerGridSettings` → `RenderEngine2GridSettings` |
| `fromClinicalRenderGrid()` | Reverse adapter |
| `monitorLayoutToLeadLayout()` / `leadLayoutToMonitorLayout()` | Layout bridges |
| `DEFAULT_MONITOR_LEAD` | `"II"` convention |
| `VIEWER_FOUNDATION_CONTRACT_VERSION` | `sprint74-v1` |

---

## Files Modified

| File | Change |
|------|--------|
| `types.ts` | Cross-reference comment on `EcgLeadLayoutMode` ↔ monitor shared modes |
| `monitorLayout.ts` | `MonitorLayoutMode` = `MonitorSharedLeadLayoutMode \| MonitorExclusiveLayoutMode` |
| `rendering-engine/types.ts` | `EcgRenderGridSettings` = `Pick<EcgViewerGridSettings, …>` (removed duplicate fields) |
| `render-engine-2/types.ts` | JSDoc linking `paperSpeed` ↔ `EcgViewerGridSettings.speed` |
| `index.ts` | Export `viewerFoundationContracts`; remove 4 dead barrel exports |

---

## Dead Exports Removed (Barrel Only)

Files **retained** on disk (integration scripts still reference them); removed from public `viewer/index.ts` API:

| Export removed | Reason |
|----------------|--------|
| `EcgWaveformPlaybackTimeline` | Not used in active foundation (Sprint 52) |
| `EcgFloatingToolPalette` | Removed from foundation |
| `EcgRenderingEngineView` | Superseded by `EcgClinicalVisualizationCanvas` |
| `EcgViewerToolbar` | Superseded by `EcgZeroChromeToolbar` |

---

## Duplicate Resolution Matrix

| Domain | Before | After |
|--------|--------|-------|
| **Leads** | `STANDARD_ECG_LEADS` in `types.ts` only | Unchanged — already canonical |
| **Grid (viewer)** | `EcgViewerGridSettings` standalone | Canonical in `types.ts` |
| **Grid (clinical render)** | Duplicate 4-field interface | `Pick` from viewer grid |
| **Grid (hospital render)** | `RenderEngine2GridSettings` with `paperSpeed` | Kept; adapter `toHospitalRenderGrid()` documents mapping |
| **Layout (workstation)** | `EcgLeadLayoutMode` | Canonical |
| **Layout (monitor)** | Separate string union (duplicate values) | Derived from shared + exclusive types |
| **Layout (workspace chrome)** | `EcgWorkspaceLayoutMode` | Unchanged — distinct concern (panel presets) |

---

## Architecture Boundaries (Preserved)

```
types.ts                          ← canonical leads, grid, view modes
    ↓
viewerFoundationContracts.ts      ← adapters + re-exports
    ↓
├── EcgMonitorViewerFoundation    (workspace — untouched logic)
├── EcgLiveMonitorShell           (live monitor — untouched logic)
├── rendering-engine/             (clinical 12-lead pipeline)
└── render-engine-2/              (hospital realtime)
```

**Not modified:** canvas drawing, waveform playback engine, signal processing, sidebar HMI, transport controls.

---

## Circular Dependency Check

| Module | Imports |
|--------|---------|
| `viewerFoundationContracts.ts` | `types`, `monitorLayout`, `render-engine-2/types`, `rendering-engine/types` |
| `monitorLayout.ts` | `types`, `rendering-engine/twelveLeadLayout` |
| `rendering-engine/types.ts` | `types` only |

No cycle detected.

---

## Validation Details

### Typecheck
```
tsc -p server/tsconfig.json --noEmit  ✅
tsc -p artifacts/ecg-insight/tsconfig.json --noEmit  ✅
```

### Unit Test Failure (Pre-Existing)

| Test | Failure | Sprint 74 introduced? |
|------|---------|----------------------|
| `scripts/ecg-viewer-engine.test.ts` | `fitZoomForDimensions(…, "width")` returns `1` not `0.94` | **No** — `ecgImageEngine.ts` not modified |

**Action:** Document only. Out of scope for Sprint 74 per fail-safe policy.

---

## Remaining Technical Debt (Future Sprints)

| Item | Notes |
|------|-------|
| `EcgBenchmarkResult` vs `RenderEngine2BenchmarkResult` | Separate engines; namespaced, not merged |
| `clinical-visualization/types.ts` `EcgGridPreset` | Visual theme presets — distinct from calibration grid |
| Server `ecg-diagnostic-engine` lead strings | Server-side literals; no frontend type sharing (by design) |
| Legacy component files on disk | `EcgViewerToolbar.tsx`, etc. — archive in Sprint 71+ cleanup |

---

## Import Guide (Post-Sprint 74)

```typescript
// Preferred — foundation contracts
import {
  STANDARD_ECG_LEADS,
  DEFAULT_GRID,
  toClinicalRenderGrid,
  toHospitalRenderGrid,
  type EcgLeadId,
  type MonitorLayoutMode,
} from "@/components/ecg/viewer/viewerFoundationContracts";

// Or via barrel
import { toClinicalRenderGrid, type EcgLeadId } from "@/components/ecg/viewer";
```

---

## Sprint 74 Verdict

✅ **SUCCESS** — Viewer foundation contracts unified; typecheck/build/lint green; zero new errors.

*No STOP condition triggered for Sprint 74 scope.*
