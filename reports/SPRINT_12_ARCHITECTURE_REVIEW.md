# Sprint 12 Architecture Review — Enterprise Workspace Foundation

**Date:** 2026-07-03  
**Charter:** [MASTER_ENGINEERING_CHARTER.md](./MASTER_ENGINEERING_CHARTER.md)

---

## Principle: Extension Over Creation

Sprint 12 followed the Master Engineering Charter — **no duplicated functionality**. All new surface area extends existing services, hooks, and backend pipelines from Sprints 11.0/11.1.

---

## Component Map

```
EnterpriseUI (full-bleed /copilot)
└── CopilotWorkspaceScreen (copilot.tsx — orchestration)
    ├── CopilotResizableWorkspace (web panels)
    │   ├── Conversation sidebar (copilot.tsx)
    │   ├── Chat column
    │   │   ├── Header (fixed)
    │   │   ├── CopilotErrorBoundary
    │   │   │   └── CopilotMessageList (FlashList)
    │   │   │       └── CopilotMessageCard (memo)
    │   │   └── CopilotComposer (fixed dock)
    │   │       └── UploadPipelineProgress
    │   └── CopilotClinicalPanel
    └── voiceEngine / uploadPipeline / copilot service (existing + extended)
```

---

## Reuse Matrix

| Need | Reused / Extended | Created New |
|------|-------------------|-------------|
| Message rendering | Extracted from `copilot.tsx` → `CopilotMessageCard` | No duplicate renderer |
| Rich medical text | Existing `RichMedicalText` component | — |
| Upload notices | `formatUploadNotice` from `copilotUpload.ts` | — |
| Upload API | `apiRequest` / `ApiError` from `api.ts` | `getCopilotAttachmentProcessing()` poll client |
| Upload stages | Sprint 11.1 backend attachment pipeline | `runUploadPipeline()` UI orchestration |
| OCR | Sprint 11.1 `clinical-ocr.service.ts` | Enhanced preprocessing only |
| Attachment SSOT | Sprint 11.1 context builder | Clinical panel reads same context |
| Voice | Existing `voiceEngine.ts` | Extended statuses + waveform hooks |
| Streaming | Existing `streamCopilotMessage` | `markStreaming()` state bridge |
| Errors | Existing `normalizeApiError` in `api.ts` | `clinicalErrors.ts` for upload/clinical domain |
| Enterprise layout | Existing `EnterpriseUI` | `fullBleedPage` flag |
| Resizable panels | — | `CopilotResizableWorkspace` (new, no prior equivalent) |
| Virtualization | — | `CopilotMessageList` with FlashList (replaces ScrollView) |

---

## Intentional Extraction (Not Duplication)

The monolithic `copilot.tsx` (~1,140 lines) was decomposed into focused components under `components/copilot/`. The original inline implementations were **removed**, not copied. Test compatibility is preserved via re-exports:

```typescript
export { CopilotMessageCard as MessageCard, AttachmentChip };
```

---

## Unavoidable New Modules

| Module | Why New |
|--------|---------|
| `uploadPipeline.ts` | Client-side stage orchestration + polling — no existing frontend pipeline coordinator |
| `CopilotResizableWorkspace.tsx` | No prior resizable panel wrapper in codebase |
| `CopilotMessageList.tsx` | FlashList integration requires dedicated scroll/virtualization layer |
| `clinicalErrors.ts` | Domain-specific error messages complement generic `normalizeApiError` |

---

## Backend Changes (Minimal)

- OCR preprocessing enhancements in existing service
- Processing endpoint returns completed attachment (extends Sprint 11.1 async flow)
- Optional `model` field in stream response metadata

No new copilot engine modules — Sprint 12 is **frontend/workspace focused**.

---

## Technical Debt Carried Forward

1. **`copilot.tsx` orchestration** — Conversation sidebar, mutations, and export logic remain in route file (~800 lines). Recommend Sprint 13 hook extraction (`useCopilotWorkspace`).
2. **Unused StyleSheet entries** — Legacy message styles may remain after extraction; safe cleanup in Sprint 13.
3. **FlashList on native** — Full v2 benefits require New Architecture; graceful fallback on older RN builds.
4. **In-process job queue** — Sprint 11.1 debt; Redis queue deferred.

---

## Security & Error Boundaries

- `CopilotErrorBoundary` scopes failures to message list — composer and header remain interactive
- Upload cancel via `AbortSignal` propagated to API client
- Assistant content sanitized via existing `sanitizeAssistantContent`

---

## Sprint 13 Architecture Targets

1. Embed `EcgProViewer` + timeline as dockable workspace panels (reuse existing viewers)
2. Zustand normalized store for patient/case/attachment entities
3. Redis-backed job queue + notification center integration
4. Code-split heavy viewers at route boundary
5. Prometheus metrics on copilot pipeline stages

---

## Duplication Audit Result

**✅ PASS** — No duplicated components, hooks, or services introduced in Sprint 12. All changes are extraction, extension, or net-new modules with documented justification.
