# Performance Benchmark Report

**Generated:** 2026-07-07

## Harness

**Script:** `scripts/qa/performance-benchmark.mjs`  
**Probe spec:** `tests/e2e/performance-viewer-ready.spec.ts`

## Metrics

| Metric | Threshold | Method |
|--------|-----------|--------|
| API `/health` | 500ms | `fetch` timing |
| API `/live` | 500ms | `fetch` timing |
| API `/ready` | 500ms | `fetch` timing |
| API login | 3000ms | POST `/api/auth/login` |
| Viewer ready | 60000ms | Playwright workspace load |
| Bundle size | tracked | `dist/` folder scan (when built) |

## Command

```bash
npm run qa:performance
```

**Requires:** API server running (`infra:health` or Playwright global setup)

## Output

`test-results/performance/benchmark.json`

## Future Benchmarks

| Area | Planned Approach |
|------|------------------|
| Monitor FPS | Canvas RAF counter in probe spec |
| Digitization latency | Integration timer wrapper |
| AI analysis | Copilot stream duration metric |
| Memory / CPU | Chrome DevTools Protocol in CI |
| GPU | Status bar GPU label + perf log |

## Production Impact

**None** — read-only measurement scripts.
