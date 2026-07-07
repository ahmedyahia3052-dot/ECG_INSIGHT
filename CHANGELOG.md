# Changelog

## Sprint37-LiveMonitor (2026-07-07)

### Added
- Dedicated **Live ECG Monitor Workspace** at `/ecg-live-monitor` and `/ecg-live-monitor/[caseId]`
- `EcgLiveMonitorShell`, status panel, lead strip, transport controls, engine, and keyboard shortcuts
- Diagnostic Monitor fullscreen mode (ESC exit) with floating controls
- Sidebar nav item **Live Monitor** and case detail **Live Monitor** button
- Integration test `scripts/sprint37-live-monitor-workspace.integration.ts`
- Playwright suite `tests/e2e/sprint37-live-monitor.spec.ts` (`@sprint37`, 4 tests)

### Changed
- `EcgLiveMonitorView` supports `chrome` variants for standalone workspace embedding
- Enterprise shell full-bleed includes `/ecg-live-monitor` routes

### Unchanged
- ECG Review Workspace (`/ecg-workspace`, `EcgMonitorViewerFoundation`) — no functional changes

---

# Changelog — Sprint 36 Clinical Validation

## Sprint36-QA (2026-07-07)

### Validation
- Added `scripts/sprint36-clinical-validation.integration.ts` covering phases 1–10
- Added `tests/e2e/sprint36-clinical-validation.spec.ts` (`@sprint36-qa`, 8 tests)
- Registered integration script in `scripts/integration/pipeline.mjs`

### Fixed
- Infinite re-render loops in history stack, status metrics, workspace persistence, and AI overlay sync
- Duplicate React keys for custom measurement presets
- Web DOM `nativeID` warnings; added `ecgNativeId` / `ecgAnchorId` helpers
- Cross-origin ECG image loading (Helmet CORP policy)
- Nested buttons in measurement rows
- AI annotation merge duplicating generated overlays

### QA
- Updated floating palette E2E locators for Sprint 35 toolbar labels
- Generated Sprint 36 validation and QA reports
