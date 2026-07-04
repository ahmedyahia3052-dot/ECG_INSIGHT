# Changelog

All notable changes to this project are documented in this file.

---

## [Sprint-12-Stable] — 2026-07-04

### Added

- Copilot workspace components: `CopilotMessageList`, `CopilotMessageCard`, `CopilotComposer`, `CopilotResizableWorkspace`, `CopilotClinicalPanel`, `CopilotErrorBoundary`, `UploadPipelineProgress`
- `uploadPipeline.ts` with stage tracking and polling
- `clinicalErrors.ts` for normalized clinical/upload errors
- `@shopify/flash-list`, `react-resizable-panels` dependencies
- `scripts/sprint12-enterprise-workspace.integration.ts`
- Integration pipeline SSOT: `scripts/integration/pipeline.mjs`, `scripts/run-integration-suite.mjs`
- Integration teardown helper: `scripts/finish-integration.ts`
- Infrastructure: `scripts/infrastructure/startup-health-manager.mjs`, `scripts/validate-rc-pipeline.mjs`
- E2E: `bootstrapAuthenticatedPage`, `auth-logout-regression.spec.ts`, extended `tests/e2e/test.ts` platform guard

### Changed

- Refactored `copilot.tsx` into extracted workspace components with full-bleed enterprise layout
- `EnterpriseUI` full-bleed mode for `/copilot`
- `voiceEngine` extended statuses, waveform, streaming lifecycle
- `copilot.ts` attachment processing polling + abort support
- `npm test` runs canonical 53-script integration suite
- Localhost development requests skip express rate limiter (E2E stability)
- OAuth provider discovery failure no longer blocks password login

### Fixed

- Copilot nested scroll / composer visibility
- Textarea unbounded growth (120px cap)
- Upload send before pipeline completion
- Integration script hang (Tesseract/Prisma open handles)
- Patient `patientCode` allocation collisions (MAX SQL + retry)
- E2E rate-limit 429 failures during full suite runs
- Login Sign In button incorrectly disabled when OAuth discovery fails
- Playwright flakiness in clinical workflows, copilot memory, release candidate UI

### Deferred

- Sprint 13: embedded ECG viewer panels, Redis queue, Zustand normalization, Prometheus export

---

## [Sprint-11-Stable] — prior

See git history and sprint-specific reports under `SPRINT_*` markdown files.
