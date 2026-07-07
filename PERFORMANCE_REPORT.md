# Performance Report — Sprint 33.5

## Targets

- 60 FPS viewer
- Smooth zoom/pan/resize
- No unnecessary re-renders

## Optimizations

| Change | Impact |
|--------|--------|
| Portal tooltips | Only mount when visible; no layout thrash in toolbar |
| Floating palette idle hide | Removes 14 DOM nodes when idle |
| Hero fit once | `initialFitRef` guard preserved |
| Memoized panels | All major panels remain memoized |
| Throttled status bar | 500ms interval unchanged |

## GPU

- Layer stack retains `translateZ(0)` compositing hint
- Crosshair overlay uses fixed 1px lines

## Validation

```
npm run build     → pass
Playwright 2/2    → pass (no timeout retries)
```
