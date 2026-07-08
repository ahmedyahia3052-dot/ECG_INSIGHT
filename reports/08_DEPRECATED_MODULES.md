# 08 — Deprecated Modules

**Audit:** Sprint 69 | Read-only

---

## Deprecated by Design (Intentional Adapters)

| Module | Path | Marker | Replacement | Classification |
|--------|------|--------|-------------|----------------|
| Legacy measurement adapter | `server/src/modules/ecg-diagnostic-engine/adapter.ts` | `toLegacyMeasurementResult` | `ecg-measurement-engine` DTOs | **Deprecated** — keep until frontend migrates |
| Legacy interpretation | `server/src/modules/ecg-interpretation/` | Used internally by enterprise engine | `ecg-interpretation-engine` | **Deprecated** — internal only |
| Legacy FHIR export | `server/src/modules/hospital-integration/` (fhir routes) | Frontend still calls | `fhir-hl7-interoperability-engine` | **Deprecated** |
| Legacy CDSS evaluate | `server/src/modules/clinical-intelligence/cdss.service.ts` | Frontend `clinicalIntelligence.ts` | `clinical-decision-support` Sprint 65 | **Deprecated** |
| Legacy longitudinal | `clinical-intelligence/longitudinal-ecg` | `LongitudinalECGPanel.tsx` | `ecg-longitudinal-timeline-engine` | **Deprecated** |
| Billing plan aliases | `server/src/subscriptions/monetization.service.ts` | "Legacy alias" comments | Current plan IDs | **Deprecated** |
| LLM config guard | `server/src/llm/llm-config.ts` | `@deprecated` on key blocking | Env validation | **Deprecated** |

---

## Deprecated Shims (Throw on Use)

| Module | Path | Behavior | Classification |
|--------|------|----------|----------------|
| Intent classifier | `server/src/modules/copilot/engine/intent-classifier.ts` | Throws "deprecated" | **Deprecated** + **Unused** |
| Tool orchestrator | `server/src/modules/copilot/engine/tool-orchestrator.ts` | Throws "deprecated" | **Deprecated** + **Unused** |
| Response orchestrator alias | `server/src/modules/copilot/core/response-orchestrator.ts` | `@deprecated` re-export | **Deprecated** |

---

## Deprecated UI Components (Orphaned)

| Component | Path | Superseded By | Classification |
|-----------|------|---------------|----------------|
| `EcgWorkspaceViewer` | `components/ecg/EcgWorkspaceViewer.tsx` | `EcgEnterpriseWorkspaceScreen` | **Deprecated** |
| `EcgViewerToolbar` | `viewer/EcgViewerToolbar.tsx` | `EcgZeroChromeToolbar` | **Deprecated** |
| `EcgFloatingToolPalette` | `viewer/EcgFloatingToolPalette.tsx` | Bottom bar / HMI | **Deprecated** |
| `EcgRenderingEngineView` | `viewer/EcgRenderingEngineView.tsx` | `EcgClinicalVisualizationCanvas` | **Deprecated** |
| `EcgLiveMonitorUnifiedStatusBar` | `viewer/EcgLiveMonitorUnifiedStatusBar.tsx` | HMI status bar + hospital HUD | **Deprecated** |
| `EcgLiveMonitorGridShell` | `viewer/EcgLiveMonitorGridShell.tsx` | `EcgLiveMonitorShell` (overlay) | **Deprecated** / experimental |
| `EcgReadingStationLayout` | `viewer/EcgReadingStationLayout.tsx` | `EcgViewerResizableWorkspace` | **Deprecated** / experimental |

---

## Isolated / Not Integrated (Effective Deprecation)

| Module | Path | Evidence | Classification |
|--------|------|----------|----------------|
| EMKP Knowledge Platform | `enterprise/emkp/` | README + CHANGELOG: zero production integration | **Deprecated** (isolated) |
| Drizzle API server | `artifacts/api-server/` | Production uses Prisma `server/` | **Review Required** |
| Drizzle DB lib | `lib/db/` | Paired with api-server | **Review Required** |
| Root mobile stub | `mobile/` | 5 files, future native | **KEEP (Future)** |
| Mockup sandbox | `artifacts/mockup-sandbox/` | Dev-only UI | **KEEP (Future)** |

---

## Deprecated Patterns (Cross-Cutting)

| Pattern | Location | Notes |
|---------|----------|-------|
| `"monitor"` view mode in workspace | `EcgViewModeSwitcher`, `clinical-workflow/engine.ts` | Removed Sprint 52; references remain |
| Horizontal toolbar in narrow sidebar | `EcgLiveMonitorClinicalToolbar` in left rail | Fixed by sidebar hotfix; toolbar file kept |
| Overlay live monitor layout | `EcgLiveMonitorShell` | May be deprecated if grid shell adopted |
| Sprint report files at repo root | 288 `*.md` | Documentation debt; archive policy needed |

---

## Server Modules — Active but Legacy-Backed

These are **KEEP** (production) but internally call deprecated layers:

| Active Module | Calls Deprecated |
|---------------|------------------|
| `ecg-diagnostic-pipeline` | `ecg-measurement`, `ecg-interpretation` adapters |
| `ecg-interpretation-engine` | `ecg-interpretation/engine.ts` |
| `ecg-processing` routes | Legacy + enterprise paths |
| `notification-center` | Delegates to enterprise-notification-engine |

---

## Deprecation Timeline Recommendation

| Phase | Action | Modules |
|-------|--------|---------|
| **Q1** | Remove orphan UI files | Grid shell, reading station, legacy toolbars |
| **Q2** | Migrate frontend APIs | FHIR, CDSS, timeline |
| **Q3** | Remove legacy server routes | hospital-integration FHIR, longitudinal-ecg |
| **Q4** | Collapse adapters | ecg-interpretation, ecg-measurement facades |
| **Future** | EMKP decision | Integrate or archive `enterprise/emkp/` |

---

## Classification Summary

| Classification | Count |
|----------------|------:|
| **Deprecated** (intentional adapters) | 7 |
| **Deprecated** (orphan UI) | 7 |
| **Deprecated** (isolated platforms) | 1 (EMKP) |
| **Review Required** | 3 (Drizzle stack, api-server, overlay vs grid) |

---

*Read-only. No deprecations enacted.*
