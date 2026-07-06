# Screenshots — Before / After Sprint 29

## Before (Sprint 26)

- Flat icon ribbon with all tools in horizontal scroll
- Header title row consuming vertical space
- 4px workspace padding and gaps
- Side panels always visible unless manually toggled
- No diagnostic fullscreen mode
- No floating tool palette

**Reference:** `test-results/screenshots/sprint26-compact-layout.png` (if captured)

## After (Sprint 29)

| Screenshot | Description |
|------------|-------------|
| `test-results/screenshots/sprint29-zero-chrome-toolbar.png` | Contextual collapsible tool groups, compact mode switcher |
| `test-results/screenshots/sprint29-diagnostic-mode.png` | F11 diagnostic mode — ECG fills screen, minimal chrome |
| `test-results/visual-inspector/shell-1920x1080.png` | Full workstation at 1920×1080 |
| `test-results/visual-inspector/shell-3840x2160.png` | 4K validation |

## Visual Changes Summary

- Toolbar height: 44px → 48px contextual groups (within 52px limit)
- Workspace padding: 4px → 2px
- Header title row: removed (patient info in status bar / diagnostic strip)
- Viewer width: increased via collapsed rails (60px + 48px minimum)
- New floating palette bottom-right on viewer
- Diagnostic mode: black background, zero side panels

## How to Capture

```bash
npx playwright test tests/e2e/sprint29-zero-chrome-clinical-workspace.spec.ts
node scripts/sprint23/visual-inspector-engine.mjs
```

Screenshots are written automatically to `test-results/screenshots/` and `test-results/visual-inspector/`.
