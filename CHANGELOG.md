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
