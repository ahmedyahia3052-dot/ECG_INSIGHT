# Test Coverage Report

**Generated:** 2026-07-07  
**Purpose:** Regression stabilization baseline before Sprint 38 merge

---

## Integration Tests

| Layer | Count | Entry |
|-------|-------|-------|
| Integration scripts | 96 | `scripts/integration/pipeline.mjs` |
| Unit tests (in pipeline) | 12 | e.g. `ecg-clinical-workflow.test.ts` |
| Sprint 38 integration | 1 | Excluded from regression gate until merge |

**Command:** `npm test`  
**Status:** Pass (full suite, prior run after Sprint 18–25 marker fixes)

---

## Playwright E2E

| Metric | Value |
|--------|-------|
| Spec files | 45 |
| Approx. test cases | ~140 (incl. mobile/tablet projects) |
| Workers | 1 (API singleton) |
| Tags | `@smoke`, `@enterprise`, `@sprint*`, `@restoration`, `@accessibility` |

### Coverage by domain

| Domain | Spec files | Notes |
|--------|------------|-------|
| Auth & session | 4 | Stabilized with `auth-login-screen` / `auth-sign-in-button` |
| Clinical workflows | 1 | Patient, case, upload, report — **passing** |
| ECG workspace (Sprint 13–37) | 28 | Selectors updated via `ecg-workspace-locators.ts` |
| Sprint 38 AI Cardiologist | 1 | **Excluded** from `qa:regression` |
| Copilot / AI | 5 | Long-running; run in enterprise gate |
| Enterprise validation | 2 | Full API + UI matrix |
| Mobile / tablet | 1 | 2 viewports × shared specs |
| Release / smoke | 4 | RC, production, accessibility, app load |

### Shared test utilities

| File | Role |
|------|------|
| `tests/e2e/utils/qa.ts` | Auth, fixtures, navigation, copilot helpers |
| `tests/e2e/utils/ecg-workspace-locators.ts` | Sprint 35–aware ECG selectors |
| `tests/e2e/utils/clinical-upload.ts` | Upload API helper |
| `tests/e2e/utils/ecg-fixture-image.ts` | Synthetic ECG PNG |

---

## Static Analysis

| Check | Command | Status |
|-------|---------|--------|
| ESLint | `npm run lint` | Pass |
| TypeScript | `npm run typecheck` | Pass |
| Build | `npm run build` | Pass |

---

## Gaps & Follow-ups (Post–Sprint 38)

1. Re-enable `tests/e2e/sprint38-ai-cardiologist.spec.ts` in `qa:regression` after merge.
2. Full `npm run qa:e2e` should be run once on a clean machine with Ollama available for copilot specs.
3. Copilot conversational tests with LLM latency may need extended timeouts or `@slow` tag segregation.
4. Visual inspector baseline (`scripts/sprint23/visual-inspector-engine.mjs`) should be run after any viewer chrome change (by Sprint 38 agent).

---

## Regression Gate Command

```bash
npm run qa:regression
```

Stages: lint → typecheck → build → integration → smoke e2e → restoration/sprint30 → enterprise e2e (Sprint 38 excluded).
