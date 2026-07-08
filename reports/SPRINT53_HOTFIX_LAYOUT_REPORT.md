# Sprint 53 Hotfix — ECG Reading Station Layout Rewrite

## Status: IMPLEMENTED — visual QA reviewed on captured screenshots

## Problem
Sprint 53 enterprise grid layout centered a small ECG image with large black margins. Side rails defaulted open and nested flex/grid shells consumed reading area.

## Solution — four-region architecture
Replaced `EcgViewerResizableWorkspace` / `EcgWorkstationGridShell` wiring with **`EcgReadingStationLayout`**:

```
HEADER → WORKFLOW → ECG VIEWER → STATUS BAR
```

Side rails live inside the viewer row only when toggled or auto-opened.

### Key files
| File | Change |
|------|--------|
| `EcgReadingStationLayout.tsx` | New 4-region shell, resizable rails |
| `ecgReadingStationTokens.ts` | 64/260 left, collapsed defaults |
| `EcgMonitorViewerFoundation.tsx` | Rewired to reading station; rails hidden by default |
| `EcgProViewerEngine.tsx` | Fit-width default, layout-sized rendering, ResizeObserver |
| `EcgUnifiedClinicalLeftPanel.tsx` | Patient/Study/Acquisition/Notes accordions (collapsed) |
| `EcgDiagnosticWorkstationShell.tsx` | `compactMode` hides in-viewer ribbons |
| `useEcgViewerControls.ts` | Default `fitMode: "width"` |

### Behavior
- **Fit Width** default; vertical scroll when tracing exceeds viewport height
- **Left rail:** hidden by default; 64px collapsed / 260px expanded; resizable
- **Right rail:** hidden by default; opens for measurement, calipers, AI review, compare
- **Workflow:** compact sticky row under header
- **Toolbar:** max two rows (toolbar + view/layout switchers in header)

## Validation

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| Sprint 53 enterprise E2E (4) | PASS |
| Hotfix visual E2E (9) | PASS |
| Fill width ≥90% (DOM) | PASS all viewports |

### Visual inspection (screenshots)
Captured at `validation-screenshots/sprint53-hotfix-layout/`:

| Resolution | Visual assessment |
|------------|-------------------|
| 3840×2160 | **PASS** — ECG grid spans nearly full reading width; rails hidden |
| 1920×1080 | **PASS** — ECG fills width; thin side gutters only |
| 1366×768 | **PASS** — ECG dominates viewer; compact chrome |

Before: centered ~50% width ECG with large black margins (Sprint 53 grid).
After: fit-width ECG is the dominant element; UI defers to the tracing.

## Tests
```bash
npx playwright test tests/e2e/sprint53-hotfix-layout-visual.spec.ts tests/e2e/sprint53-ecg-workspace-enterprise.spec.ts --project=chromium-desktop
```

## Operator notes
- Start stack: `npm run dev` (API 3002 + frontend 8081)
- Workspace: `/ecg-workspace?caseId=<id>`
- Toggle left clinical rail from toolbar; measurement mode auto-opens right Measurement Studio
