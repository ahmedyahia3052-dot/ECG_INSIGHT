# 04 — Duplicate Code Report

**Audit:** Sprint 69 | Read-only

---

## Summary

The repository exhibits **intentional layering** (legacy → enterprise adapters) alongside **accidental duplication** (parallel UI shells, overlapping APIs). ~15 major duplicate clusters identified.

---

## 1. Monitor UI Shells

| Original (Active) | Duplicate | Relationship | Merge Recommendation |
|-------------------|-----------|--------------|----------------------|
| `EcgLiveMonitorShell.tsx` (overlay HMI) | `EcgLiveMonitorGridShell.tsx` | Grid shell from layout hotfix; **never imported** | **Delete** grid shell OR wire it and remove overlay — product decision |
| `EcgLiveMonitorHmiLeftRail.tsx` | `EcgLiveMonitorClinicalToolbar.tsx` (horizontal scroll in sidebar context) | Toolbar removed from sidebar hotfix; toolbar still exists for other contexts | **KEEP** toolbar for non-sidebar uses; do not re-embed in sidebar |
| `live-monitor-hmi/` status bar | `EcgLiveMonitorUnifiedStatusBar.tsx` | Unified bar superseded | **Delete** unified bar |
| `live-monitor-v2/EcgLiveMonitorFloatingPalette.tsx` | `EcgLiveMonitorHmiBottomBar.tsx` | Palette removed Sprint 52 | **Delete** floating palette |

---

## 2. Workspace / Viewer Layouts

| Original | Duplicate | Merge Recommendation |
|----------|-----------|----------------------|
| `EcgViewerResizableWorkspace.tsx` → `EcgWorkstationGridShell.tsx` | `EcgReadingStationLayout.tsx` + `ecgReadingStationTokens.ts` | **Delete** reading station OR complete Sprint 53 integration |
| `EcgMonitorViewerFoundation.tsx` | `EcgWorkspaceViewer.tsx` | **Delete** legacy workspace viewer |
| `EcgZeroChromeToolbar.tsx` | `EcgWorkstationToolbar.tsx` (re-export alias) | **KEEP** one; remove alias export |
| `EcgZeroChromeToolbar.tsx` | `EcgViewerToolbar.tsx` (Sprint 13) | **Delete** Sprint 13 toolbar |

---

## 3. Rendering Engines

| Original | Duplicate | Merge Recommendation |
|----------|-----------|----------------------|
| `rendering-engine/` (clinical 12-lead) | `render-engine-2/` (hospital realtime) | **KEEP both** — different use cases; document boundary |
| `EcgClinicalVisualizationCanvas.tsx` | `EcgRenderingEngineView.tsx` | **Delete** standalone rendering view |
| `hospital-monitor/hospitalMonitorRenderer.ts` | Direct render-engine-2 calls | **KEEP** adapter pattern |
| `ecgMonitorCanvas.ts` | Third canvas path for rhythm strips | **KEEP** — specialized; document in architecture |

---

## 4. Server Measurement Stack

| Layer | Path | Relationship |
|-------|------|--------------|
| Legacy facade | `ecg-measurement/engine.ts` | Wraps diagnostic engine via `toLegacyMeasurementResult` |
| Enterprise DTO | `ecg-measurement-engine/` | Sprint 59 structured results |
| Core pipeline | `ecg-diagnostic-engine/measurement/` | Sprint 54 signal measurements |
| Frontend calipers | `ecgMeasurementEngine.ts` | Client-side geometry |

**Merge recommendation:** Consolidate API responses to single DTO; keep legacy adapter as thin shim until frontend migrates. **Do not delete** any layer yet — all actively called.

---

## 5. Server Interpretation Stack

| Original | Duplicate | Merge Recommendation |
|----------|-----------|----------------------|
| `ecg-interpretation/engine.ts` (legacy rules) | `ecg-interpretation-engine/` (enterprise sections) | **KEEP** enterprise as facade; gradually inline legacy rules |
| Frontend `EcgInterpretationPanel.tsx` | CDSS `clinicalRuleEngine.ts` (client rules) | **Review** — client rules should mirror server, not duplicate |

---

## 6. Timeline / Longitudinal

| Implementation | API Path | Frontend Consumer |
|----------------|----------|-------------------|
| `ecg-longitudinal-timeline-engine/` | `/patients/:id/timeline` | Partial |
| `clinical-intelligence/longitudinal-ecg` | `/longitudinal-ecg/` | `LongitudinalECGPanel.tsx` |
| EMR timeline | `emr.routes.ts` | `services/emr.ts` |
| Enterprise timeline | `enterprise.ts` service | Enterprise dashboard |

**Merge recommendation:** Single timeline API with versioned DTO; deprecate `/longitudinal-ecg/` after migration.

---

## 7. Knowledge Engines (4 catalogs)

| Module | Purpose | Overlap |
|--------|---------|---------|
| `knowledge-engine/` | Copilot education tree | ECG topics |
| `clinical-knowledge-engine/` | Diagnosis catalog Sprint 58 | ECG diagnoses |
| `medical-intelligence-core/` | MIC guidelines | Diagnoses + guidelines |
| `enterprise/emkp/` | 47 diseases (isolated) | Full overlap potential |

**Merge recommendation:** Unified knowledge graph with source tags; archive EMKP or integrate via import pipeline.

---

## 8. Clinical Decision Support

| Original | Duplicate | Merge Recommendation |
|----------|-----------|----------------------|
| `clinical-decision-support/` (Sprint 65) | `clinical-intelligence/cdss.service.ts` | Frontend uses legacy `/cdss`; migrate to Sprint 65 API |
| `cdss-workspace/clinicalRuleEngine.ts` (client) | Server CDSS engines | Move evaluation server-side only |

---

## 9. Alerts & Risk (3 systems)

| System | Scope | Path |
|--------|-------|------|
| Collaboration alerts | Team notifications | `collaboration.routes.ts` |
| Patient clinical alerts | Patient-level | `clinical-intelligence` |
| Case alerts-risk | Case-level Sprint 64 | `clinical-alerts-risk-engine` |

**Merge recommendation:** Unified alert model with `scope: patient|case|team` — not deletion, consolidation.

---

## 10. FHIR / Interop

| Original (New) | Duplicate (Legacy) | Merge Recommendation |
|----------------|-------------------|----------------------|
| `/interop/fhir/export/:caseId` | `/fhir/export` (hospital-integration) | Migrate `services/hospital.ts` to interop routes |
| `enterprise-report-engine/fhir-export.ts` | Above | Single FHIR serializer module |

---

## 11. Reports (3 generators)

| Module | Role |
|--------|------|
| `reports/` | Clinical CRUD, PDF/HTML |
| `enterprise-report-engine/` | Enterprise templates |
| `ai-report-generator/` | AI-composed sections |

**Status:** Orchestrated by diagnostic pipeline — **not true duplicates**; document pipeline order.

---

## 12. Routes

| Route | Duplicate Of | Action |
|-------|--------------|--------|
| `/ecg-monitor/[caseId]` | `/ecg-workspace` | **KEEP** alias for bookmarks; document |
| `/ecg-live-monitor` vs `/ecg-live-monitor/[caseId]` | Deep link variant | **KEEP** both |

---

## 13. Documentation Duplicates

| File A | File B | Recommendation |
|--------|--------|----------------|
| `API_SPEC.md` | `API_SPECIFICATION.md` | Rename EMKP spec to `EMKP_API_SPEC.md` |
| `COVERAGE_DIFF.md` | `scripts/COVERAGE_DIFF.md` | Keep one in `docs/qa/` |
| `UNTESTED_FILES.md` | `scripts/UNTESTED_FILES.md` | Keep one |
| `VISUAL_AUDIT.md` | `VISUAL_AUDIT_REPORT.md` | Archive older |
| `SCREENSHOT_BEFORE_AFTER.md` | `SCREENSHOTS_BEFORE_AFTER.md` | Merge |

---

## 14. Integration Scripts

| Script A | Script B | Overlap |
|----------|----------|---------|
| `sprint33-enterprise-viewer-polish.integration.ts` | `sprint335-enterprise-viewer-polish.integration.ts` | Viewer polish checks |

**Merge recommendation:** Consolidate into single viewer regression script.

---

## 15. Package / ORM Duplication

| Stack A | Stack B | Recommendation |
|---------|---------|----------------|
| Prisma (`server/` + `prisma/`) | Drizzle (`lib/db` + `artifacts/api-server/`) | **Decide fate** of Drizzle stack — archive or document as dev-only |

---

## Duplicate Severity Matrix

| Severity | Clusters | Impact |
|----------|----------|--------|
| **High** | Dual ORM, dual FHIR, dual CDSS, 4 knowledge engines | Maintenance, API drift |
| **Medium** | Monitor shells, timeline APIs, toolbar variants | Developer confusion |
| **Low** | Doc duplicates, integration script overlap | Repo clutter |

---

*Read-only. No merges performed.*
