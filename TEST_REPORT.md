# Test Report — Sprint 11.1

## New Regression Suite — `scripts/sprint11.1-enterprise-hardening.integration.ts`

| Test | Validates |
|------|-----------|
| Extractor registry | ECG plugin selected and findings extracted |
| Attachment Context Builder SSOT | `normalizedContext` v11.1 stored at upload; prompt reads stored context |
| OCR cache | Repeated processing of identical file uses cache path |
| Clinical validator | Low-confidence + overconfident language flagged; review guidance appended |
| PromptBuilder independence | Module exists; React UI does not build prompts |

## Updated Suites

- `scripts/sprint11-enterprise-stability.integration.ts` — attachment block text updated for SSOT wording
- `scripts/copilot-final-closure.integration.ts` — architecture markers (replaces dead legacy OCR helpers)
- `scripts/copilot-stabilization.integration.ts` — architecture markers
- `scripts/dashboard-production-lockdown.integration.ts` — architecture markers

## Key Modules Added

### Attachment layer
- `server/src/modules/copilot/attachment/attachment-context-builder.service.ts`
- `server/src/modules/copilot/attachment/ocr-cache.service.ts`
- `server/src/modules/copilot/attachment/attachment-job-queue.service.ts`

### Extractor plugins
- `server/src/modules/copilot/extractors/registry.ts`
- `server/src/modules/copilot/extractors/modality-extractors.ts`
- `server/src/modules/copilot/extractors/document-classifier.ts`

### Prompt & validation
- `server/src/modules/copilot/prompt/prompt-builder.ts`
- `server/src/modules/copilot/validation/attachment-validator.ts`
- `server/src/modules/copilot/validation/clinical-validator.ts`

## Commands

```bash
npm run lint
npm run typecheck
npx tsx scripts/sprint11.1-enterprise-hardening.integration.ts
npx tsx scripts/sprint11-enterprise-stability.integration.ts
npx tsx scripts/copilot-enterprise-workspace.integration.ts
```
