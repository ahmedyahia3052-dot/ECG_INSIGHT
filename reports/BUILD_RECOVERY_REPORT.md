# BUILD_RECOVERY_REPORT — Sprint 70 (Strict Mode)

**Date:** 2026-07-08  
**Status:** ⛔ **STOPPED — Manual approval required**  
**Agent:** Build Recovery (Strict Mode)

---

## Executive summary

Sprint 70 build recovery **cannot proceed automatically**. All **12 TypeScript errors** blocking `npm run typecheck` and `npm run build` originate in **forbidden UI modules** (Live Monitor, Viewer, Viewer Foundation). Per the Global Enterprise Safety Policy and Sprint 70 fail-safe rule, **no fixes were applied**.

| Validation | Result |
|------------|--------|
| `npm run lint` | ✅ Pass |
| `npx tsc -p server/tsconfig.json --noEmit` | ✅ Pass |
| `npm run typecheck` (includes frontend) | ❌ **12 errors** |
| `npm run build` | ❌ Fails at typecheck step |

**Files changed by Sprint 70 agent:** **None**

---

## Why execution stopped

Sprint 70 permits only:

- TypeScript error fixes
- Broken imports / exports / typings
- Path alias fixes

**Without modifying UI**, including:

- ECG Workspace, Live Monitor, Viewer, Rendering Engine, Canvas, Waveform, Sidebar, Toolbar, React Layouts

Every blocking error lives inside `artifacts/ecg-insight/` under Live Monitor or Viewer paths. Resolving them requires editing those files or their co-located Viewer modules (hooks, types, tokens, foundation components). **That violates scope.**

---

## Blocking errors (complete inventory)

### Group A — Live Monitor route / case resolver mismatch (4 errors)

| File | Line | Error | Root cause |
|------|------|-------|------------|
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | 37 | `candidateCases` missing on resolver type | `useEcgWorkspaceCaseResolver` returns `{ demoMode, isResolving, resolveError, resolvedCaseId }` only |
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | 38 | `demoCaseId` missing | Same — resolver stub does not expose `demoCaseId` |
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | 41 | `phase` missing | Same — `EcgWorkspaceResolvePhase` flow not implemented in resolver |
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | 42 | `refetch` missing | Same — no query refetch handle returned |

**Root cause:** `EcgExaminationWorkflowGate` and `ecg-live-monitor.tsx` expect an expanded resolver API (`candidateCases`, `demoCaseId`, `phase`, `refetch`), but `useEcgWorkspaceCaseResolver.ts` was reduced to a minimal 4-field return. This is a **partial integration** between Sprint 37+ Live Monitor workflow gate and the resolver hook.

**Fix location (forbidden):**
- `artifacts/ecg-insight/components/ecg/viewer/useEcgWorkspaceCaseResolver.ts`
- Possibly `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx`

---

### Group B — Missing export / rename mismatch (2 errors)

| File | Line | Error | Root cause |
|------|------|-------|------------|
| `artifacts/ecg-insight/components/ecg/viewer/EcgExaminationWorkflowGate.tsx` | 8 | `EcgWorkspaceResolvePhase` not exported | Type never defined/exported from `useEcgWorkspaceCaseResolver.ts` |
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorGridShell.tsx` | 4 | `LIVE_MONITOR_LAYOUT` not exported | Token file exports `HMI_LAYOUT`; consumer expects `LIVE_MONITOR_LAYOUT` (likely rename drift) |

**Fix location (forbidden):**
- `artifacts/ecg-insight/components/ecg/viewer/useEcgWorkspaceCaseResolver.ts`
- `artifacts/ecg-insight/components/ecg/viewer/live-monitor-hmi/ecgLiveMonitorHmiTokens.ts`
- `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorGridShell.tsx`

---

### Group C — View mode type drift (2 errors)

| File | Line | Error | Root cause |
|------|------|-------|------------|
| `artifacts/ecg-insight/components/ecg/viewer/clinical-workflow/engine.ts` | 111 | `"monitor"` not in view mode union | `EcgWorkstationViewMode` in `types.ts` has `"waveform"` but not `"monitor"` |
| `artifacts/ecg-insight/components/ecg/viewer/EcgViewModeSwitcher.tsx` | 13 | `"monitor"` not assignable to `EcgWorkstationViewMode` | Same — switcher lists `"monitor"` mode; type union omits it |

**Current type definition** (`types.ts` lines 69–77):

```typescript
export type EcgWorkstationViewMode =
  | "ai-review" | "compare" | "image" | "measurement"
  | "overlay" | "processed" | "report" | "waveform";
```

**Fix location (forbidden):**
- `artifacts/ecg-insight/components/ecg/viewer/types.ts`
- `artifacts/ecg-insight/components/ecg/viewer/EcgViewModeSwitcher.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/clinical-workflow/engine.ts`

---

### Group D — Viewer Foundation prop contract drift (4 errors)

| File | Line | Error | Root cause |
|------|------|-------|------------|
| `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | 637 | `coords` not on HUD props | HUD/status component props missing `coords`, `imageHeight`, etc. |
| `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | 672 | `leadLayout` not on shell props | Layout shell props type missing `leadLayout` |
| `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | 688 | `leadLayout` not on canvas props | Canvas component `Props` missing `leadLayout` |
| `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | 719 | `leadLayout` not on canvas props | Same |

**Root cause:** `EcgMonitorViewerFoundation.tsx` passes props (`coords`, `leadLayout`, extended HUD fields) that downstream component type definitions no longer accept — likely from parallel Sprint 49/53 Live Monitor HMI work landing without synchronized prop interfaces.

**Fix location (forbidden):**
- `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx`
- Related HUD/shell/canvas component prop types in Viewer tree

---

## Recommended manual fix plan (requires approval)

Execute in a **UI-approved sprint** (not Sprint 70 strict mode):

1. **Restore `useEcgWorkspaceCaseResolver`** full API: export `EcgWorkspaceResolvePhase`, return `candidateCases`, `demoCaseId`, `phase`, `refetch` aligned with `EcgExaminationWorkflowGate`.
2. **Align HMI tokens:** export `LIVE_MONITOR_LAYOUT` from `ecgLiveMonitorHmiTokens.ts` (alias or rename from `HMI_LAYOUT`, include `sidebarWidth`).
3. **Extend `EcgWorkstationViewMode`:** add `"monitor"` OR replace `"monitor"` usages with `"waveform"` consistently across switcher + workflow engine.
4. **Sync Viewer Foundation props:** add `coords`, `leadLayout`, and related fields to HUD/shell/canvas `Props` interfaces, or remove unused prop passes from foundation.

---

## Unrelated / passing areas

| Area | Status |
|------|--------|
| `server/src/**` TypeScript | ✅ Clean |
| `npm run lint` (server + scoped frontend lint paths) | ✅ Clean |
| Prisma generate | ✅ Succeeds |
| Backend API (Sprint 66/72 work) | ✅ Not affected |

---

## Manual approval required

To complete build recovery, approve **one** of:

| Option | Description | Risk |
|--------|-------------|------|
| **A** | Lift Sprint 70 UI restriction for Viewer/Live Monitor type-sync only | Low if typings-only, no behavior change |
| **B** | Dedicated UI integration sprint (recommended) | Controlled review of Live Monitor + Viewer Foundation |
| **C** | Temporarily exclude `artifacts/ecg-insight` from root `typecheck` script | ⚠️ Masks frontend errors; not true build recovery |

---

## Fail-safe compliance

- ✅ No UI files modified  
- ✅ No files deleted, moved, or renamed  
- ✅ No git rollback or force commands  
- ✅ No out-of-scope backend changes  
- ⛔ Build not restored — stopped at first forbidden dependency  

**Sprint 70 agent exit.**
