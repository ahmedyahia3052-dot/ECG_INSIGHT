# Release Notes — Sprint 12 Stable

**Version tag:** `Sprint-12-Stable`  
**Release date:** 2026-07-04  
**Theme:** Enterprise Workspace Foundation

---

## Highlights

- **Copilot workspace refactor** — Monolithic copilot screen split into focused components (message list, composer, resizable panels, clinical sidebar, error boundary).
- **Upload pipeline 2.0** — Stage-tracked uploads with OCR integration, cancel/retry, and send gating until processing completes.
- **Voice workflow hardening** — Extended lifecycle states, waveform feedback, streaming-aware silence detection.
- **Enterprise layout** — Full-bleed copilot route; fixed header/composer with independent message scrolling.
- **Validation pipeline** — 53-script integration suite + 57 Playwright E2E specs green under managed infrastructure.

---

## What's New

### Frontend

- `CopilotMessageList` with FlashList virtualization
- `CopilotComposer` with auto-growing textarea (48–120px cap)
- `CopilotResizableWorkspace` (web, `react-resizable-panels`)
- `UploadPipelineProgress` with stage UI
- `clinicalErrors.ts` for normalized user-facing errors

### Backend

- Enhanced clinical OCR preprocessing
- Copilot attachment processing endpoint returns completed payloads
- Deterministic patient code allocation under concurrency

### Developer Experience

- `npm test` runs full 53-script integration pipeline
- `scripts/validate-rc-pipeline.mjs` for automated RC gates
- Infrastructure health manager for deterministic E2E server lifecycle

---

## Fixes

- Copilot composer pushed off-screen by nested scroll
- False “no speech detected” without captured audio
- Send allowed before upload pipeline finished
- Integration scripts hanging after pass (open handles)
- E2E flakiness from rate limits, OAuth health false-positives, and login screen disabled states
- `patientCode` unique constraint collisions under parallel creates

---

## Upgrade Notes

- No database migration required beyond existing Prisma schema.
- Run `npm run prisma:generate` after pull.
- E2E: use managed servers (Playwright global setup) or `node scripts/infrastructure/prepare-validation.mjs`.

---

## Known Deferred Items (Sprint 13)

- Embedded ECG Pro Viewer in dockable panels
- Redis-backed OCR cache / job queue
- Zustand normalized entity store
- Prometheus metrics export

---

## Validation

All Sprint 12 RC gates passed on 2026-07-04. See [FINAL_SPRINT12_REPORT.md](./FINAL_SPRINT12_REPORT.md) for the full gate matrix.
