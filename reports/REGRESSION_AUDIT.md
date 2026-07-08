# Regression Infrastructure Audit

**Date:** 2026-07-07  
**Scope:** Parallel regression stabilization (no Sprint 38 feature work)  
**Sprint 38 exclusion:** `EcgAiCardiologistWorkspace.tsx`, `ai-cardiologist/*`, `sprint38-*` specs/scripts left untouched.

---

## Executive Summary

Regression infrastructure was stabilized by hardening shared Playwright helpers, adding stable auth test IDs, updating obsolete ECG workspace selectors in **test files only**, and aligning legacy integration scripts with Sprint 35 UI markers. No ECG viewer, live monitor, measurement UI, or clinical panel components were modified.

---

## Root Causes Identified

| Category | Issue | Impact |
|----------|-------|--------|
| **Auth helpers** | `uiLogin`/`logout` did not clear cookies/storage reliably; `localStorage` accessed on restricted documents | Cascading failures across ~70 Playwright specs |
| **Auth selectors** | Login relied on text-only `Welcome Back` | Fragile when page not fully hydrated |
| **ECG test IDs** | Specs referenced removed IDs (`sprint29-exit-diagnostic`, `sprint29-zero-chrome-toolbar`) | Sprint 29/31/23 failures |
| **Integration scripts** | Sprint 18–25 marker checks predated Sprint 35 cockpit layout | Full `npm test` failures |
| **Collapsible UI** | Pipeline chips live inside collapsed "Workflow" section | Sprint 31 false negatives |
| **Flaky waits** | Fixed `waitForTimeout(2000)` in logout regression | Removed |

---

## Files Modified (Regression Only)

### Auth infrastructure
- `artifacts/ecg-insight/components/auth/PremiumAuth.tsx` — `testID` on shell + sign-in button
- `artifacts/ecg-insight/app/login.tsx` — `auth-sign-in-button` test ID
- `tests/e2e/utils/qa.ts` — `clearAuthState`, `ensureLoginScreen`, hardened `uiLogin`/`logout`

### Playwright specs (selectors only)
- `tests/e2e/auth-logout-regression.spec.ts`
- `tests/e2e/login-screen-stability.spec.ts`
- `tests/e2e/production-smoke.spec.ts`
- `tests/e2e/sprint23-visual-inspector-ai.spec.ts`
- `tests/e2e/sprint29-zero-chrome-clinical-workspace.spec.ts`
- `tests/e2e/sprint31-clinical-workspace-polish.spec.ts`
- `tests/e2e/sprint30-clinical-workflow.spec.ts` (prior session)

### Shared locators
- `tests/e2e/utils/ecg-workspace-locators.ts` (Sprint 35 fallbacks — prior session)

### Integration scripts
- `scripts/sprint18-ecg-clinical-workstation.integration.ts`
- `scripts/sprint21-ecg-workstation-ux-revolution.integration.ts`
- `scripts/sprint22-hospital-workstation.integration.ts`
- `scripts/sprint23-visual-inspector-ai.integration.ts`
- `scripts/sprint24-hospital-workstation-rebuild.integration.ts`
- `scripts/sprint25-hospital-ux-rebuild.integration.ts`
- `scripts/sprint335-enterprise-viewer-polish.integration.ts`
- `scripts/sprint23/visual-inspector-engine.mjs`

### Regression runner
- `scripts/run-full-regression.mjs` (new)
- `package.json` — `qa:regression` script

---

## Validation Status

| Gate | Status |
|------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` (integration) | Pass (prior full run) |
| Auth smoke (`auth-*`, `login-screen-stability`, `production-smoke`) | **5/5 pass** |
| Clinical workflows + upload | **3/3 pass** |
| ECG restoration + Sprint 29/30 | Pass |
| Full `npm run qa:e2e` | Not re-run end-to-end (prior cascade from auth); use `npm run qa:regression` post–Sprint 38 |

---

## Sprint 38 Safety

The following were **not modified**:

- `artifacts/ecg-insight/components/ecg/viewer/EcgAiCardiologistWorkspace.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/ai-cardiologist/**`
- `tests/e2e/sprint38-ai-cardiologist.spec.ts`
- `scripts/sprint38-ai-cardiologist-workspace.integration.ts`

Regression runner excludes `@sprint38` Playwright specs via `--grep-invert`.

---

## Recommended Post–Sprint 38 Merge

```bash
npm run qa:regression
```

This runs: lint → typecheck → build → integration → smoke e2e (excl. Sprint 38) → restoration/sprint30 e2e → enterprise e2e (excl. Sprint 38).

Then add Sprint 38 specs to the final gate once the other agent's branch is merged.
