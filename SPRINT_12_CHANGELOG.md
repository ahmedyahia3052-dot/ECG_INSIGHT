# Sprint 12 Changelog — Enterprise Workspace Foundation

**Release:** Sprint-12-Stable  
**Date:** 2026-07-03

---

## Added

### Frontend — Copilot Components (`artifacts/ecg-insight/components/copilot/`)

- **CopilotMessageList** — FlashList virtualization, “New messages” button, scroll handle ref
- **CopilotMessageCard** — Memoized message rendering, `RichMedicalText`, attachment chips
- **CopilotComposer** — Fixed composer dock, auto-grow textarea (48–120px), upload tools, waveform, pipeline progress
- **CopilotResizableWorkspace** — Web resizable three-panel layout (`react-resizable-panels` v4)
- **CopilotClinicalPanel** — Patient/document context sidebar
- **CopilotErrorBoundary** — Scoped error boundary for message list
- **UploadPipelineProgress** — Stage UI with cancel/retry
- **types.ts** — Shared copilot workspace types, `DEFAULT_UPLOAD_ANALYSIS_PROMPT`

### Services & Utilities

- **uploadPipeline.ts** — `runUploadPipeline()` with stage tracking and polling
- **clinicalErrors.ts** — `normalizeClinicalError`, `friendlyUploadError`

### Dependencies

- `@shopify/flash-list` — Message list virtualization
- `react-resizable-panels` — Resizable workspace panels (web)

### Tests

- **scripts/sprint12-enterprise-workspace.integration.ts** — Sprint 12 regression suite
- Updated integration tests for component extraction (workspace foundation, dashboard lockdown, stabilization, final closure, clinical-ai-v3)

### E2E Fixes

- **tests/e2e/utils/qa.ts** — `waitForCopilotIdle()` aligned with Sprint 12 voice status labels
- **tests/e2e/copilot-voice-conversation.spec.ts** — Status badge assertions via `copilot-voice-status` testID

---

## Changed

### Copilot Screen (`artifacts/ecg-insight/app/(protected)/copilot.tsx`)

- Refactored monolithic screen into extracted components
- Full-bleed enterprise layout integration
- Upload pipeline job gating before send
- Voice status lifecycle aligned with `voiceEngine` extensions
- Export PDF/TXT retained in header tools
- Re-exports `MessageCard` / `AttachmentChip` aliases for test compatibility

### Enterprise Shell (`artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx`)

- Full-bleed mode for `/copilot` route (no nested page scroll)

### Copilot Service (`artifacts/ecg-insight/services/copilot.ts`)

- `getCopilotAttachmentProcessing()` for async upload polling
- Upload supports `AbortSignal`

### Voice Engine (`artifacts/ecg-insight/services/voiceEngine.ts`)

- Extended statuses: permission, uploading, streaming, cancelled, timeout
- Waveform via `onAudioLevel` / `AnalyserNode`
- `capturedAudioBytes` for silence detection
- `markStreaming()` during SSE delivery

### Backend

- **clinical-ocr.service.ts** — Enhanced preprocessing (rotate, contrast, threshold)
- **copilot.routes.ts** — Processing endpoint returns full attachment when completed
- **pipeline.ts** / **engine/types.ts** — Optional `response.model` in stream payload

---

## Fixed

- Copilot nested scroll pushing composer off-screen
- Textarea unbounded growth (now capped at 120px)
- False “no speech detected” without audio capture
- Send allowed before upload processing complete
- Multi-file attach E2E regression (removed auto-send on upload; uses `DEFAULT_UPLOAD_ANALYSIS_PROMPT` on send)
- Integration tests expecting inline `RichMedicalText` after component extraction
- ECG interval extraction test updated for SSOT `normalizedContext`

---

## Removed / Not Duplicated

- Inline message card, composer, and attachment chip implementations from `copilot.tsx` (moved to dedicated components — **extension, not duplication**)
- Auto-send-on-upload behavior that conflicted with multi-attach workflow

---

## Deferred to Sprint 13

- Embedded ECG Pro Viewer + timeline in dockable panels
- Zustand normalized entity store
- Redis-backed OCR cache and job queue
- Prometheus metrics export
- Production ClamAV adapter
- Expanded Playwright upload/streaming coverage
- Code-split heavy viewers (PDF, ECG, charts)
