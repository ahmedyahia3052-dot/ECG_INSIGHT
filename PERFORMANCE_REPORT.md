# Performance Report — Sprint 46

**Date:** 2026-07-07

---

## Rendering

| Area | Approach |
|------|----------|
| Center canvas | Existing GPU path via `EcgProViewerEngine` |
| Rhythm strip | `requestAnimationFrame` loop, phosphor fade |
| Difference regions | Path-length heuristic (no blocking compute) |
| React | Memoized shell components, no new global state loops |

---

## Targets

| Metric | Design |
|--------|--------|
| Canvas FPS | Status bar instrumentation (Sprint 36) |
| Memory | Rhythm strip cancels RAF on unmount |
| Large studies | Existing viewport culling / dirty rect (Sprint 27) |

---

## Benchmark

Run with live API:

```bash
npm run infra:health
npm run qa:performance
```

Sprint 46 adds lightweight UI chrome only; no new blocking API calls.
