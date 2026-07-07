# Playwright Report — Sprint 44 Clinical Decision Support

**Date:** 2026-07-07  
**Spec:** `tests/e2e/sprint44-cdss-workspace.spec.ts`  
**Tags:** `@sprint44 @enterprise`

## Test Coverage

| Test | Verifies |
|------|----------|
| CDSS workspace renders triage badge and clinical summary | Tab pane, workspace, triage badge, summary/diagnosis headings |
| CDSS panels include differential evidence recommendations guidelines risk | All 7 workspace panels + relationship graph |
| report view includes clinical decision support section | Report mode CDSS section with testID |
| Sprint 43 report engine sections remain present | Patient Header, AI Findings, Doctor Review regression |

## Run Command

```bash
playwright test tests/e2e/sprint44-cdss-workspace.spec.ts --grep "@sprint44"
```

## Results (2026-07-07)

**4 passed** (3.4m, chromium-desktop)

## Sprint 43 Regression

```bash
playwright test tests/e2e/sprint43-clinical-report-engine.spec.ts --grep "@sprint43"
```

**4 passed** (3.6m)
