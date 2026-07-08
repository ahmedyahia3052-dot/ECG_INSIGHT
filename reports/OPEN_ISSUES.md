# Open Issues — RC-1

**Date:** 2026-07-07  
**Classification:** BLOCKER | HIGH | MEDIUM | LOW | COSMETIC

---

## Summary

| Severity | Open | Resolved in RC-1 |
|----------|------|------------------|
| BLOCKER | **0** | 0 |
| HIGH | **0** | 7 |
| MEDIUM | 3 | 3 |
| LOW | 3 | 0 |
| COSMETIC | 1 | 0 |

---

## Resolved (RC-1 / SAT)

### RC1-001 — HIGH — Sprint 19 canvas monitor integration ✅
Integration script expected `drawMonitorCanvas` in `EcgLiveMonitorView.tsx`; refactored to `drawMultiLeadMonitorCanvas`. Script updated.

### RC1-002 — HIGH — Caliper geometry CSV test ✅
Export schema expanded to v6 columns; test assertion updated.

### RC1-003 — HIGH — Medical intelligence API 500 ✅
Missing Prisma migrations deployed.

### RC1-004 — MEDIUM — Sprint 25 clinical panel marker ✅
Integration accepts Sprint 38 AI Cardiologist workspace.

### RC1-005 — MEDIUM — Playwright API flake ✅
Network retry in test helpers.

### RC1-006 — HIGH — Sprint 34 wave detection marker scan ✅
Integration script did not scan `ecgWaveDetectionBridge.ts` for `snapToNearestFiducial`; source list expanded.

### RC1-007 — BLOCKER — TypeScript gate failures ✅
- `EcgMonitorViewerFoundation.tsx`: restored `selectedLead` / `setSelectedLead` state (`EcgLeadId`, default `"II"`)
- `buildEnterpriseReportModel.ts`: use `buildCardiologistModel` with flat analysis input; `model.rhythm.rhythm` instead of `.label`

---

## Open — MEDIUM

### RC1-M01 — Statement coverage below 70% target
- **Area:** Vitest instrumentation
- **Current:** 27.3% statements on production `.ts` files
- **Impact:** Does not block clinical workflows; increases regression risk for uninstrumented hooks
- **Recommendation:** Continue Vitest expansion in Phase 2

### RC1-M02 — Full Playwright sweep flaky under parallel server startup
- **Area:** E2E (189 specs)
- **Observed:** 11/15 smoke pass isolated; failures include ECONNREFUSED when API recycled mid-suite
- **Recommendation:** Run `npm run qa:e2e` sequentially after `npm run infra:health` in staging

### RC1-M03 — Four smoke specs intermittently fail
- `app-loads-without-offline` (0ms setup)
- `auth-logout-regression` re-login
- `copilot-runtime-smoke`
- `mobile-responsive` (API drop on long runs)

---

## Open — LOW

### RC1-L01 — Performance benchmark requires live API
- **Fix:** Run `npm run infra:health` before `npm run qa:performance`

### RC1-L02 — Optional RC stress suite (`QA_RC_STRESS=1`)
- 60-minute copilot endurance not executed in default RC gate

### RC1-L03 — `qa:rc` 5-run stability gate optional
- Single-run Playwright passes; consecutive stability recommended for hardened deploy

---

## Open — COSMETIC

### RC1-C01 — Left rail empty-state copy
- "No prior reports on file" may read as placeholder to new users
- Functional empty state, not a defect

---

## Blockers

**None.**

> **ECG Insight is Ready for Feature Development Phase 2.**
