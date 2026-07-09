# Performance Baseline — Sprint 103.5 Pre-Migration Audit

**Captured:** 2026-07-09 (pre-Bolt import)  
**Build:** Expo web export (`npm run build` in monorepo)

---

## Bundle Size (Web)

| Asset | Size | Path |
|-------|------|------|
| Main entry bundle | **4.75 MB** | `dist/_expo/static/js/web/entry-4fd847e305f935e1abca12bde9462925.js` |
| Resizable panels chunk | **0.036 MB** | `react-resizable-panels-*.js` (Copilot) |
| **Total JS (approx.)** | **~4.79 MB** | Single large entry — no route-level splitting on most pages |

### Observations

- Monolithic entry dominates; only copilot/monitor lazy wrappers exist (`presentation/lazy.ts`) with **no Suspense boundaries** found.
- 46 route files compile into one primary bundle for web export.
- **Target post-Bolt:** &lt; 2.5 MB initial + route-based code splitting per primary surface.

---

## Route Size (logical, not separate chunks)

| Route group | Est. complexity | Lazy loaded |
|-------------|-----------------|-------------|
| Auth (public) | Low | No |
| Dashboard / Cases | Medium | No (container pattern) |
| ECG Viewer / Workspace | **Very High** | Partial dynamic imports |
| Copilot | High | `CopilotResizableWorkspace` dynamic |
| Upload | Medium | `uploadPipeline` dynamic |
| Admin / Reports | Medium | No |

---

## Core Web Vitals

| Metric | Baseline | Method | Notes |
|--------|----------|--------|-------|
| **LCP** | Not measured | — | Requires Lighthouse CI or Playwright trace on deployed preview |
| **FCP** | Not measured | — | Same |
| **CLS** | Not measured | — | Enterprise shell sidebar transitions may affect CLS |
| **TTI** | Not measured | — | 4.48 MB entry suggests high TTI on 3G |

### Recommended capture (Sprint 104+)

```bash
# After preview deploy
npx lighthouse https://preview-url/dashboard --output=json
# Or Playwright performance trace on critical routes
```

**Placeholder targets for Bolt migration:**

| Metric | Target |
|--------|--------|
| LCP | &lt; 2.5s (p75) |
| FCP | &lt; 1.8s |
| CLS | &lt; 0.1 |
| Initial JS | &lt; 250 KB gzip (route shell) |

---

## Memory

| Surface | Baseline | Notes |
|---------|----------|-------|
| ECG Viewer | Not profiled | Canvas + waveform buffers — monitor in Chrome Performance |
| Dashboard | Not profiled | Multiple React Query caches |
| Copilot | Not profiled | Streaming + resizable panels |

**Risk:** Viewer/Workspace hold large typed arrays; Bolt must not duplicate canvas instances.

---

## Network / API

| Pattern | Impact |
|---------|--------|
| React Query staleTime 30s | Reduces refetch; good |
| Dashboard 4+ parallel queries | Waterfall risk — adapter already batches contract |
| ECG file fetch | Largest payload — keep out of main bundle |

---

## Build Performance

| Step | Last known (Sprint 98) |
|------|------------------------|
| Full `npm test` | ~24 min exit 0 |
| Frontend build | Completes with 4.48 MB bundle warning |
| Typecheck | PASS |

---

## Baseline Checklist (re-run after each migration stage)

- [ ] Record `entry-*.js` byte size
- [ ] Lighthouse on `/dashboard`, `/ecg-viewer`, `/upload-ecg`
- [ ] Chrome heap snapshot on viewer open/close
- [ ] Compare React Query cache key count per session
