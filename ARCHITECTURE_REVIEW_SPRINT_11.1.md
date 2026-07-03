# Architecture Review — Sprint 11.1 Enterprise Production Hardening

**Date:** 2026-07-03  
**Charter:** [MASTER_ENGINEERING_CHARTER.md](./MASTER_ENGINEERING_CHARTER.md)  
**Release validation:** [FINAL_RELEASE_VALIDATION.md](./FINAL_RELEASE_VALIDATION.md)

---

## Implemented Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Attachment Context Builder (SSOT) | `server/src/modules/copilot/attachment/attachment-context-builder.service.ts` | Single structured clinical context at upload time |
| OCR Cache | `server/src/modules/copilot/attachment/ocr-cache.service.ts` | SHA-256 keyed OCR result cache |
| Attachment Job Queue | `server/src/modules/copilot/attachment/attachment-job-queue.service.ts` | Non-blocking upload processing |
| Medical Extractor Registry | `server/src/modules/copilot/extractors/` | Plugin-based modality extractors |
| Prompt Builder | `server/src/modules/copilot/prompt/prompt-builder.ts` | Independent prompt assembly (no UI coupling) |
| Attachment Validator | `server/src/modules/copilot/validation/attachment-validator.ts` | Pre-prompt attachment confidence gates |
| Clinical Validator | `server/src/modules/copilot/validation/clinical-validator.ts` | Post-LLM safety and review flags |
| Pipeline Metrics | `server/src/modules/copilot/observability/clinical-pipeline-metrics.ts` | Structured upload/OCR/LLM timing events |
| Clinical OCR Service | `server/src/modules/ocr/clinical-ocr.service.ts` | Tesseract + pdf-parse + sharp preprocessing |
| Upload Ingest | `server/src/modules/copilot/copilot-upload-ingest.service.ts` | ZIP/DICOM extraction |
| Clinical Linkage | `server/src/modules/copilot/copilot-clinical-linkage.service.ts` | Patient → Visit → ECG Case auto-linkage |
| Voice Transcription | `server/src/modules/copilot/voice-transcription.service.ts` | Multipart Whisper via Ollama |
| File Security Hook | `server/src/utils/file-security.ts` | Threat scan abstraction (EICAR/script stub) |

---

## Design Decisions

1. **Upload-time analysis, chat-time read-only** — Clinical context is persisted as `normalizedContext` v11.1 on the attachment record. Chat pipeline reads stored context; it does not re-run OCR or extractors. Eliminates duplicate logic and inconsistent findings.

2. **Extractor plugin registry** — New modalities register via `medicalExtractorRegistry` without modifying the attachment pipeline or routes. Open/Closed compliance.

3. **PromptBuilder isolation** — All prompt assembly lives server-side. React copilot UI displays data only; verified by integration test asserting no `buildAttachmentContextBlock` in UI.

4. **Async attachments behind feature flag** — `COPILOT_ASYNC_ATTACHMENTS=true` routes heavy uploads through the job queue with `GET /attachments/:id/processing` status polling. Default sync path preserved for backward compatibility.

5. **Clinical validation as pipeline stage** — Validators run after LLM response generation, appending physician-review guidance when confidence is low or definitive language is detected.

6. **Virus scan as upload gate** — `scanFileForThreats` runs before pipeline processing; blocked uploads are deleted and return `UPLOAD_THREAT_DETECTED`. Production ClamAV integration can replace the local abstraction without route changes.

---

## Performance Impact

| Change | Effect |
|--------|--------|
| OCR cache (SHA-256) | Eliminates duplicate OCR on identical file bytes |
| Background job queue | Prevents HTTP timeout on large ECG/PDF uploads when async enabled |
| Upload-time-only extraction | Chat turns no longer pay OCR/extractor latency |
| Parallel preprocessing (sharp) | Image normalization runs before Tesseract without blocking subsequent pipeline stages |

**Remaining:** Redis-backed cache and queue for horizontal scaling (documented as future enhancement).

---

## Security Impact

| Control | Status |
|---------|--------|
| Role-based upload (`requireRole("DOCTOR")`) | Active |
| File size / MIME validation | Active |
| Patient/case access checks | Active |
| Threat scan hook on upload | Active (local stub; ClamAV-ready) |
| Audit logging on attachment processing | Active |
| PHI in structured context only to LLM | Active — raw files never sent to LLM |

---

## Scalability Impact

- Stateless chat path reads DB-stored context — scales with API replicas.
- Job queue is in-process today; interface allows Redis/BullMQ swap without pipeline rewrite.
- OCR cache is in-memory/file today; keyed by hash for future shared cache layer.
- Extractor plugins are pure functions — horizontally safe.

---

## Technical Debt Removed

- Removed dead legacy OCR paths from `copilot.routes.ts`
- Eliminated chat-time `analyzeAttachmentsStructured` re-analysis
- Consolidated three overlapping OCR interpretation layers into extractor registry + SSOT builder
- Fixed server Whisper transcription (audio bytes now sent via multipart FormData)
- Wired clinical validator on active pipeline path (was disclaimer-only)

---

## Charter Compliance Snapshot

| Area | Status | Notes |
|------|--------|-------|
| Clean Architecture / SSOT pipeline | ✅ | Upload → OCR → Extractors → Context → Prompt → LLM → Validator |
| No UI business logic | ✅ | Verified by integration test |
| Plugin extractors | ✅ | Registry + ECG/lab/radiology/echo/cath/general |
| OCR cache + background jobs | ✅ | Feature-flagged async |
| Voice status lifecycle | ✅ | listening/recording/processing/thinking/speaking/completed/error |
| Chat UX (100vh, fixed input, compact) | ✅ Partial | Composer docked; virtualization not yet implemented |
| Workspace (dockable panels) | ⏳ | Future sprint |
| Message virtualization (10k+) | ⏳ | ScrollView today; FlashList planned |
| Observability metrics export | ⏳ | Structured logs; no Prometheus yet |
| Virus scan | ✅ Hook wired | ClamAV integration future |
| Regression tests per bug | ✅ | Sprint 11 + 11.1 integration suites |

---

## Remaining Risks

1. **In-process job queue** — Server restart loses in-flight jobs; acceptable for single-node dev/staging, not multi-instance production.
2. **Local threat scan stub** — EICAR/script signature only; not a substitute for enterprise AV.
3. **No message virtualization** — Long conversations may degrade React render performance before FlashList migration.
4. **Whisper via Ollama** — Quality and availability depend on local model; dedicated STT service recommended for production SLA.
5. **Dedicated Ultrasound/MRI/CT extractors** — Partially covered by radiology extractor; separate plugins needed for full charter coverage.

---

## Recommendations (Sprint 12+)

1. **FlashList message virtualization** in copilot chat for 10,000+ message charter compliance.
2. **Dockable workspace shell** — extract panel layout engine from clinical workspace prototype.
3. **Redis OCR cache + job queue** for multi-instance deployment.
4. **ClamAV adapter** implementing `scanFileForThreats` interface without route changes.
5. **Prometheus metrics** — export histograms from `clinical-pipeline-metrics` (upload_ms, ocr_ms, llm_ms).
6. **Frontend async upload polling** — wire UI to `/attachments/:id/processing` when async flag enabled.
7. **Dedicated modality extractors** — Ultrasound, MRI, CT as separate registry plugins.

---

## Test Evidence

```
npm run lint                          → Pass
npm run typecheck                     → Pass
scripts/sprint11.1-enterprise-hardening.integration.ts → Pass (includes threat scan regression)
scripts/sprint11-enterprise-stability.integration.ts   → Pass
scripts/copilot-enterprise-workspace.integration.ts    → Pass
```
