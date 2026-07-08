# Known Limitations — Post Sprint 12

Sprint 11.0 production-critical gaps resolved in Sprint 11.1. Sprint 12 delivered enterprise workspace UX (layout, virtualization, upload pipeline UI, voice hardening, resizable panels). Items below are **non-critical future enhancements** for Sprint 13+.

## Completed (Sprint 11.1)

- Attachment Context Builder as single source of truth for uploaded file clinical context
- Medical extractor plugin registry (ECG, lab, radiology, echo, cath, general)
- Independent PromptBuilder (no prompt logic in React components)
- Clinical validation layer (pre-prompt + post-LLM)
- OCR result caching by file hash
- Background attachment job queue (`COPILOT_ASYNC_ATTACHMENTS=true`)

## Completed (Sprint 12)

- Enterprise full-bleed copilot layout (fixed header, fixed composer, independent message scroll)
- FlashList message virtualization with memoized cards
- Upload pipeline 2.0 UI (stages, cancel, retry, polling)
- Resizable three-panel workspace on web
- Voice workflow hardening (waveform, extended lifecycle, capture-aware silence)
- Enhanced OCR preprocessing (rotate, contrast, threshold)
- Unified clinical/upload error normalization
- Scoped message-list error boundary

## Future Enhancements (Sprint 13+)

### Workspace & Viewers

- ECG Pro Viewer, measurements, and timeline embedded as dockable workspace panels (clinical context panel is summary-only today)
- Code-split heavy viewers (PDF, ECG, charts) at route boundary

### State Management

- Zustand normalized entity store for patient/case/attachment/conversation

### OCR & Document Intelligence

- Multi-page scanned PDF ECG fusion across all pages
- Handwritten clinical notes with dedicated HWR model beyond Tesseract
- Cloud OCR fallback for extremely low-quality scans

### ECG Digitization

- Advanced deskew/perspective correction for phone photos at extreme angles
- Pediatric and modified Mason-Likar lead layout benchmarks

### Voice

- Server-side Whisper quality depends on Ollama model; dedicated STT service integration planned
- Native mobile TTS provider abstraction (browser speech synthesis on web today)

### Clinical AI

- Optional OpenAI tool-calling when not using Ollama
- FDA/CE-oriented formal clinical validation harness beyond current rule-based validator

### Platform & Ops

- Redis-backed OCR cache and job queue for multi-instance deployments
- Prometheus metrics export for copilot pipeline stages
- Enterprise SSO (SAML/OIDC) for tier-2 enterprise customers
- Production ClamAV adapter (`scanFileForThreats` hook exists; swap-in pending)
- Expanded Playwright E2E for upload pipeline, streaming, and resizable panels
