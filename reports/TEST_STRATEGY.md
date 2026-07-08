# ECG Insight Enterprise Test Strategy

**Version:** 1.0  
**Date:** 2026-07-07  
**Scope:** QA infrastructure only — no production feature changes

---

## Mission

Provide continuous, automated quality gates for enterprise ECG Insight development while running **in parallel** with System Acceptance Test (SAT) and Sprint 38 workstreams.

---

## Test Pyramid

| Layer | Tooling | Location | Gate |
|-------|---------|----------|------|
| Unit | `tsx` + Node assert | `scripts/**/*.test.ts` | `npm run qa:unit` |
| Integration | `tsx` pipeline | `scripts/*.integration.ts` | `npm test` |
| E2E | Playwright | `tests/e2e/*.spec.ts` | `npm run qa:e2e` |
| Visual | Playwright snapshots | `tests/e2e/visual-regression-enterprise.spec.ts` | `npm run qa:visual` |
| Performance | Node + Playwright probe | `scripts/qa/performance-benchmark.mjs` | `npm run qa:performance` |
| Accessibility | axe-core + Playwright | `tests/e2e/accessibility.spec.ts` | CI job |

---

## Critical Workflow Coverage (28 workflows)

All 28 enterprise workflows are mapped in `scripts/qa/config.mjs` (`WORKFLOW_MATRIX`) and exercised via:

- Existing sprint/regression specs
- **`tests/e2e/enterprise-workflow-matrix.spec.ts`** (`@qa-matrix`) — consolidated gap-filler

Sprint 38 AI Cardiologist specs are **excluded by default** from parallel QA runs (`QA_INCLUDE_SPRINT38=0`).

---

## Quality Targets

| Metric | Target | Current Infrastructure |
|--------|--------|------------------------|
| Critical workflow coverage | 100% | 28/28 mapped (100%) |
| Unit test file pass rate | 100% | 16/16 files pass |
| Code line coverage | 95%+ | **Roadmap** — requires Istanbul/c8 instrumentation (not yet wired) |
| Flaky tests | 0 | Auth helpers hardened; retries disabled in CI |
| Skipped/disabled tests | 0 | No `test.skip` in QA matrix |

---

## Commands

```bash
# Full enterprise QA orchestrator (SAT-safe, excludes Sprint 38)
npm run qa:enterprise:full

# Individual gates
npm run lint && npm run typecheck && npm run build
npm run qa:unit
npm test
npm run qa:smoke
npm run qa:matrix
npm run qa:visual
npm run qa:performance
npm run qa:dashboard
```

---

## CI/CD

GitHub Actions workflow `.github/workflows/enterprise-qa.yml`:

1. **static-gates** — lint, typecheck, build  
2. **unit-tests** — all unit files  
3. **integration** — full pipeline + domain audit  
4. **playwright** — smoke, QA matrix, accessibility, visual, mobile  
5. **quality-dashboard** — aggregates artifacts  

---

## Non-Goals (This Task)

- No production UI changes
- No workflow or runtime behavior changes
- No Sprint 38 file modifications
- No SAT test plan alterations

---

## Roadmap to 95% Line Coverage

1. Add `c8`/`vitest` harness for `artifacts/ecg-insight` hooks and utilities
2. Expand unit tests for React hooks (`useEcg*`, `useClinical*`)
3. Server module unit tests under `server/src/**/*.test.ts`
4. Enforce coverage threshold in CI once baseline ≥ 80%
