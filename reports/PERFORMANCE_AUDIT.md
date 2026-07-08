# Performance Audit — RC-1

**Date:** 2026-07-07

---

## API Latency (Infrastructure Report baseline)

| Endpoint | Typical | Threshold |
|----------|---------|-----------|
| `/live` | ~5.8s startup | Managed session |
| `/ready` (DB) | ~353ms | < 2s |
| Frontend | ~2.0s | < 10s |
| Auth login | < 500ms | Per benchmark script |

Run: `npm run infra:health && npm run qa:performance`

---

## Viewer Runtime

| Metric | Observed | Source |
|--------|----------|--------|
| Canvas FPS (idle) | ~19 | Status bar Sprint 36 |
| JS heap (status bar) | ~73 MB | Sprint 36 snapshot |
| GPU path | Canvas/SVG | Enterprise status bar |
| Zoom presets | 1, 2, 4, 8, 16 | `ecgImageEngine` unit test |

---

## Rendering Engine

| Check | Status |
|-------|--------|
| Dirty rect optimization | ✅ Unit tests (`dirtyRect.test.ts`) |
| Viewport culling | ✅ `viewport.test.ts` |
| Vector model batching | ✅ `vectorModel.test.ts` |
| Bezier monitor smoothing | ✅ `quadraticCurveTo` in `ecgMonitorCanvas.ts` |

---

## Bundle & Build

| Item | Status |
|------|--------|
| TypeScript compile | ✅ No errors |
| Prisma generate | ~3–7s |
| Vitest suite | ~14s (139 tests) |
| Integration suite | ~11–14 min |
| Frontend production bundle | Run `npm run build:frontend` for size audit |

---

## Long Tasks & Re-Renders

| Area | Mitigation |
|------|------------|
| Infinite re-render loops | Fixed Sprint 36 (history stack, AI overlay sync) |
| Measurement preset keys | Duplicate key fix Sprint 36 |
| React Query medical intelligence | `staleTime: 5min`, enabled only when digitized |

---

## Memory Leak Assessment

| Test | Result |
|------|--------|
| Auth logout cycles | ✅ Pass |
| Login 53s stability | ✅ Pass |
| Copilot listener count (stress) | ✅ ≤ +5 when enabled |

---

## Performance Classification

| Finding | Severity |
|---------|----------|
| No blocking long tasks in SAT | — |
| API startup acceptable for managed QA | LOW |
| Coverage instrumentation overhead | LOW |
| Ollama analyze 8–10s | MEDIUM (expected for local LLM) |

**No performance BLOCKERs for RC-1.**
