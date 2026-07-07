# Performance Report — Sprint 46.1 Test Infrastructure

## CI Runtime Strategy

| Change | Runtime Impact |
|--------|----------------|
| Sequential Playwright suites | +suite startup overhead (~2s cooldown between suites) |
| `workers: 1` | Longer per-suite wall time vs parallel, but fewer retries |
| Process isolation per suite | Prevents hung workers requiring full CI restart |
| `retries: 0` | Faster fail-fast; no double execution on flakes |

**Net expectation:** Slightly longer nominal Playwright wall time, significantly lower total CI time when accounting for eliminated flaky re-runs and worker hangs.

## Parallelism Model

| Layer | Parallelism |
|-------|-------------|
| GitHub Actions jobs | `static-gates`, `unit-tests`, `integration` run in parallel |
| Playwright suites | **Sequential** (smoke → enterprise → …) |
| Playwright workers | **1** per process |
| Integration scripts | Sequential (existing `run-integration-suite.mjs`) |

Only independent jobs are parallelized — browser suites are never parallelized against a shared API.

## Memory Leak Prevention

1. `destroyBrowserSession` closes page after each test
2. Sequential runner spawns **new process** per suite — OS reclaims Chromium memory
3. `PLAYWRIGHT_SUITE_COOLDOWN_MS` (default 2000) between suites allows GC
4. No persistent `storageState` file accumulation

## Artifact Overhead

| Artifact | Policy |
|----------|--------|
| Screenshots | `only-on-failure` |
| Video | `retain-on-failure` |
| Trace | `retain-on-failure` |
| JSON/JUnit reporters | Always (minimal size) |

## Validation Timings (local, 2026-07-07)

| Gate | Duration |
|------|----------|
| `npm run lint` | ~38s |
| `npm run typecheck` | ~44s |
| `npm run build` | ~26s |
| Sprint 46.1 markers | ~7s |
| Full `npm test` | ~10m (stopped at pre-existing Sprint 21 failure) |

## Recommendations

1. Run `qa:smoke` only on PR; full `qa:regression` on main/nightly
2. Keep `QA_INCLUDE_SPRINT38=0` in CI unless explicitly testing AI cardiologist
3. Use `infra:health` before local Playwright to avoid cold-start timeouts
