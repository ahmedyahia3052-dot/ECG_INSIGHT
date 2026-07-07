# CI Pipeline Report — Sprint 46.1

## Production Pipeline Order

Implemented in `scripts/run-enterprise-ci-pipeline.mjs` (`npm run qa:pipeline`):

```
Infrastructure Health
        ↓
      Lint
        ↓
   Typecheck
        ↓
      Build
        ↓
  Unit Tests (Vitest + scripts)
        ↓
  Integration (marker + API scripts)
        ↓
Playwright Smoke (sequential)
        ↓
Playwright Enterprise (sequential)
        ↓
       SAT (optional)
        ↓
  Regression (optional)
        ↓
   Artifacts (pipeline-artifacts.json)
```

## GitHub Actions (`enterprise-qa.yml`)

| Job | Parallelism | Depends On |
|-----|-------------|------------|
| `static-gates` | Independent | — |
| `unit-tests` | Independent | static-gates |
| `integration` | Independent | static-gates |
| `playwright` | Sequential suites internally | static-gates, integration |
| `quality-dashboard` | Always runs | all jobs |

Playwright job env additions:
- `PLAYWRIGHT_FRESH_SESSION: "1"`
- `QA_INCLUDE_SPRINT38: "0"` (default exclude heavy sprint38 in CI)

Playwright steps (sequential):
1. `run-playwright-sequential.mjs --suite=smoke`
2. `run-playwright-sequential.mjs --suite=enterprise`
3. Enterprise workflow matrix (single process)
4. `--suite=accessibility`
5. `--suite=visual`
6. `--suite=mobile`

## Artifact Collection

`scripts/qa/generate-pipeline-artifacts.mjs` produces `test-results/qa-artifacts/pipeline-artifacts.json`:

| Artifact | Source |
|----------|--------|
| Screenshots | `test-results/playwright-artifacts/**/*.png` |
| Traces | `test-results/playwright-artifacts/**/*.zip` |
| Videos | `test-results/playwright-artifacts/**/*.webm` |
| JUnit | `test-results/playwright-junit.xml` |
| Sequential summary | `playwright-sequential-summary.json` |
| CI summary | `ci-pipeline-summary.json` |
| Performance | `benchmark.json` |
| Coverage | `coverage-summary.json` |

## Quality Gates

Pipeline fails only on:
- Required step non-zero exit code
- Real assertion failures in Playwright/integration

Infrastructure noise (session leakage, parallel contention) is addressed at the runner level rather than ignored via retries.

## Local Commands

```bash
npm run infra:health      # Start API + frontend, verify /live
npm run qa:pipeline       # Full ordered pipeline
npm run qa:playwright:sequential -- --suite=smoke
npm run qa:sat
npm run qa:regression
```
