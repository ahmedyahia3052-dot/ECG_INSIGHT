# Changelog — Sprint 35 Doctor Experience Polish

## Changed

- **Viewport:** Panel widths 114px / 171px; hero fill 78%; layout v9
- **Toolbar:** 16px compact strip (`sprint35-compact-toolbar`)
- **Floating palette:** Pointer, Zoom, Pan, Caliper, Measure, Annotate, Rotate, Reset, Full Screen
- **Left panel:** Patient / Study / Device / Workflow sections (`sprint35-clinical-summary-panel`)
- **Right panel:** 4 tabs only — Measurements, AI Findings, Reports, History
- **Status bar:** Lead, Speed, Gain, Grid, Zoom, FPS, GPU, Memory (`sprint35-enterprise-status-bar`)
- **Diagnostic mode:** Status bar visible in fullscreen; layout restore on ESC exit
- **Workflow ribbon:** Wider step labels (max 120px) to prevent clipping

## Added

- `scripts/sprint35-doctor-experience-polish.integration.ts`
- `tests/e2e/sprint35-doctor-experience-polish.spec.ts`
- Sprint 35 reports

## Validation

- Lint, typecheck: pass
- Integration + Playwright `@sprint35-doctor`: 3/3 pass

## Not Changed

- Backend logic, AI algorithms, measurement calculations
