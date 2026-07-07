# Screenshot Before / After — Sprint 33.5

## Artifacts

| File | Description |
|------|-------------|
| `test-results/screenshots/sprint33-viewer-polish-before.png` | Sprint 33 baseline (prior sprint) |
| `test-results/screenshots/sprint335-viewer-polish-after.png` | Sprint 33.5 polished workspace |
| `test-results/screenshots/sprint335-diagnostic-after.png` | Sprint 33.5 diagnostic mode |

## Visible Improvements (After)

1. **ECG larger** — narrower side panels + 90% hero fill
2. **Toolbar slimmer** — 18px icon strip vs prior popover/group layout
3. **Tooltips** — full description text, no clipping (portal rendered)
4. **Left summary** — aligned two-column dot-leader rows
5. **Right tabs** — equal spacing; AI Findings separated from Measurements
6. **Alerts** — compact `⚠ Lead Issues (N)` chip instead of full banner
7. **Floating palette** — vertical, semi-transparent, closer to canvas
8. **Status bar** — simplified doctor metrics with larger type

## Capture Command

```bash
npx playwright test tests/e2e/sprint335-enterprise-viewer-polish.spec.ts
```
