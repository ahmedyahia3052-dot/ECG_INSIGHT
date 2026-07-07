# Playwright Report — Sprint 46

**Date:** 2026-07-07  
**Spec:** `tests/e2e/sprint46-diagnostic-ecg-workstation.spec.ts`  
**Tag:** `@sprint46 @enterprise`

---

## Test Matrix

| Test | Coverage |
|------|----------|
| Three-column hospital diagnostic shell | Left, center, right, ribbon, lead tools, rhythm strip |
| Lead tools | Isolate, magnifier, lead/beat sync toggles |
| Compare difference | Difference highlight toggle |
| AI report linking | Finding click → AI panel |
| Measurement studio | Undo/redo + studio sidebar |
| Live monitor independence | `/ecg-live-monitor` has no sprint46 shell |

---

## Fixtures

- `createClinicalFixture` with analyze + report
- Digitize API pre-step
- `openEcgWorkspace` + `assertWorkspaceShell`

---

## Run

```bash
npm run infra:health
npx playwright test tests/e2e/sprint46-diagnostic-ecg-workstation.spec.ts
```
