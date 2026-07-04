# Sprint 13 — Phase 3 Final Report  
## ECG Pro Viewer Engine — Stability Closure

**Status:** Complete (stability validated)  
**Date:** July 4, 2026  
**Tag:** `Sprint13-Phase3` (amended commit pending)

---

## Root Cause

Playwright timeouts on `/ecg-monitor/{caseId}` were caused by **two independent startup defects**, not insufficient test timeouts.

### 1. Patient-loading race in route screen (primary UI defect)

`app/(protected)/ecg-monitor/[caseId].tsx` treated a **still-loading patient query** as a failed load:

```tsx
// Before (bug)
if (caseQuery.isLoading) return <Loading />;
if (!caseQuery.data?.case || !patientQuery.data?.patient) {
  return <EmptyState title="ECG monitor unavailable" />; // NO ready testID
}
```

After the case query succeeded, `caseQuery.isLoading` became `false` while `patientQuery` was still fetching. The screen rendered **“ECG monitor unavailable”** instead of waiting. Playwright never saw `sprint13-ecg-monitor-ready` (only emitted by `EcgMonitorViewerFoundation`).

Contributing factors validated:

| Area | Finding |
|------|---------|
| Router initialization | Route registered correctly; no lazy-route failure |
| Suspense / lazy imports | `react-resizable-panels` lazy-loads but fallback still renders foundation children |
| Data loading | **Patient query not awaited** — root UI bug |
| Auth bootstrap | Direct API login without dashboard hydration was fragile; fixed in E2E |
| Store hydration | Auth refresh via cookies works once session is established |
| API readiness | `/ready` gate in Playwright fixture is correct |

### 2. Case-number allocation race (API defect under load)

`nextCaseNumber()` used `count() + 1`, which collides under concurrent case creation (Playwright parallel fixtures, integration suite). This produced HTTP 500 on `POST /api/cases`, causing fixture setup failures that appeared as flaky monitor timeouts.

---

## Fix

### Frontend — deterministic monitor lifecycle

| File | Change |
|------|--------|
| `ecgMonitorRoute.ts` | Pure `resolveEcgMonitorScreenPhase()` for auth → case → patient → ready |
| `ecg-monitor/[caseId].tsx` | Explicit phases: loading (`sprint13-ecg-monitor-loading`), unavailable, ready |
| `useAuth().isLoading` | Screen waits for auth hydration before querying |
| Patient query | Dedicated `patient-loading` phase (no premature empty state) |
| Query options | Limited retry/backoff for transient API errors |

### Backend — collision-safe case numbers

| File | Change |
|------|--------|
| `server/src/cases/cases.routes.ts` | Max-serial + existence check for `nextCaseNumber()` |
| `server/src/cases/cases.routes.ts` | Retry create on Prisma `P2002` unique constraint |

### E2E — stable bootstrap & fixture reuse

| File | Change |
|------|--------|
| `sprint13-ecg-monitor.spec.ts` | `bootstrapAuthenticatedPage` (auth + dashboard hydration) |
| `sprint13-ecg-monitor.spec.ts` | Serial mode + shared `beforeAll` fixture (1 case per run, not 5) |
| `sprint13-ecg-monitor.spec.ts` | Assert loading marker clears before ready marker |
| `sprint13-playwright-stability.mjs` | 5 consecutive run gate with cooldown |

---

## Validation

| Gate | Result |
|------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` (integration suite) | PASS |
| `npm run test:e2e` | PASS |
| Sprint 13 unit tests (`ecg-pro-viewer-engine.test.ts`) | PASS |
| Sprint 13 integration (Phases 1–3) | PASS |
| **5 consecutive Sprint 13 Playwright runs** | PASS (see below) |

---

## Performance

- Monitor route renders loading shell immediately (no blank frame → empty-state flash)
- Patient/case queries run sequentially by dependency; history loads in parallel (non-blocking)
- Shared E2E fixture reduces API load from 5 case creates → 1 per run
- Viewer engine unchanged: transform-only pan/zoom, memoized layers

---

## Playwright Stability

Script: `node scripts/sprint13-playwright-stability.mjs`

| Run | Result |
|-----|--------|
| 1/5 | PASS |
| 2/5 | PASS |
| 3/5 | PASS |
| 4/5 | PASS |
| 5/5 | PASS |

All 5 tests per run passed with:

- No retries
- No timeout increases
- No startup failures
- Loading marker clears before ready marker on every navigation

---

## Known Limitations

- Compare mode and AI overlay remain disabled until Sprint 14
- Digitized waveform layer renders only when lead path data is supplied
- Full Playwright suite (63 tests) validated separately; stress RC test remains skipped by design

---

## Conclusion

Sprint 13 Phase 3 is **production-ready** with a proven stable `/ecg-monitor` startup path. The monitor workspace now transitions reliably through auth → case → patient loading before emitting the ready signal consumed by Playwright and clinical workflows.
