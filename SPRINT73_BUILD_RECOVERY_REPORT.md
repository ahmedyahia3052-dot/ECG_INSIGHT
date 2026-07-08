# SPRINT73_BUILD_RECOVERY_REPORT

**Date:** 2026-07-08  
**Sprint:** 73 — Option B Build Recovery (Recommended)  
**Status:** ✅ **COMPLETE — All validation passing**

---

## Executive summary

Sprint 73 restored the frontend production build by repairing Viewer / Live Monitor integration type contracts. All **12 blocking TypeScript errors** from Sprint 70 are resolved. No shortcuts, mocks, casts, or `@ts-ignore` were used.

| Validation | Result |
|------------|--------|
| `npm run lint` | ✅ Pass |
| `npm run typecheck` | ✅ Pass (server + frontend) |
| `npm run build` | ✅ Pass |

---

## Fixed errors

### 1. `useEcgWorkspaceCaseResolver` contract restored

**Root cause:** Hook was reduced to a 4-field stub while `EcgExaminationWorkflowGate` and `ecg-live-monitor.tsx` expected the full examination workflow API.

**Fix:** Restored complete resolver return shape and phase machine.

| Field | Restored behavior |
|-------|-------------------|
| `candidateCases` | Image-ready cases from patient history or demo list |
| `demoCaseId` | First image-ready case id for demo load button |
| `phase` | `resolving` → `select-examination` → `ready` / `empty` / `error` |
| `refetch` | Refetches active patient or demo query |

**Exported type:** `EcgWorkspaceResolvePhase`

**File:** `artifacts/ecg-insight/components/ecg/viewer/useEcgWorkspaceCaseResolver.ts`

---

### 2. Missing symbol exports — HMI tokens

**Root cause:** `EcgLiveMonitorGridShell` imported `LIVE_MONITOR_LAYOUT` but tokens file only exported `HMI_LAYOUT`.

**Fix:** Added `LIVE_MONITOR_LAYOUT` compatibility alias mapping HMI token fields to grid shell expectations (`sidebarWidth`, `rightPanelWidth`, `gridGap`, etc.).

**File:** `artifacts/ecg-insight/components/ecg/viewer/live-monitor-hmi/ecgLiveMonitorHmiTokens.ts`

---

### 3. ViewMode contract — `"monitor"`

**Root cause:** `EcgViewModeSwitcher` and clinical workflow engine used `"monitor"` but `EcgWorkstationViewMode` union omitted it.

**Fix:** Added `"monitor"` to the canonical view mode union.

**File:** `artifacts/ecg-insight/components/ecg/viewer/types.ts`

---

### 4. Viewer Foundation prop compatibility

**Root cause:** `EcgMonitorViewerFoundation` passed props that child component types did not declare.

**Fixes:**

| Component | Props added / wired |
|-----------|---------------------|
| `EcgEnterpriseStatusBar` | `coords`, `imageHeight`, `imageWidth` (displayed in status chips) |
| `EcgImageCanvas` | `leadLayout?: EcgLeadLayoutMode` |
| `EcgDiagnosticWorkstationShell` | Optional `leadLayout`, `onLeadLayoutChange`; optional `rhythmLead` / `playback` |
| `EcgMonitorViewerFoundation` | Wired `rhythmLead` + `useEcgWaveformPlayback` to diagnostic shell |

**Files:**
- `artifacts/ecg-insight/components/ecg/viewer/EcgEnterpriseStatusBar.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgImageCanvas.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/diagnostic-workstation/EcgDiagnosticWorkstationShell.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx`

---

## Files changed (10)

| File | Change |
|------|--------|
| `useEcgWorkspaceCaseResolver.ts` | Full resolver + phase machine + exports |
| `ecgLiveMonitorHmiTokens.ts` | `LIVE_MONITOR_LAYOUT` alias |
| `types.ts` | Added `"monitor"` to view mode union |
| `EcgEnterpriseStatusBar.tsx` | Extended HUD props |
| `EcgImageCanvas.tsx` | Added `leadLayout` prop |
| `EcgDiagnosticWorkstationShell.tsx` | Extended shell prop contract |
| `EcgMonitorViewerFoundation.tsx` | Wired rhythm playback + shell props |
| `index.ts` | Re-export `EcgWorkspaceResolvePhase` |

---

## Architectural notes

- **No behavior regression intended:** Resolver phase logic mirrors `EcgExaminationWorkflowGate` expectations; rhythm strip only renders when digitized lead data exists.
- **Backward compatible:** `ecg-workspace.tsx` continues using `isResolving` / `resolveError` fields unchanged.
- **No frontend exclusion:** Root `typecheck` still includes `artifacts/ecg-insight`.

---

## Remaining unrelated issues

None blocking build. No additional architectural problems discovered.

---

## Version

`sprint73-v1`
