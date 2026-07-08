# 13 — High Risk Files

**Audit:** Sprint 69 | Read-only  
**Definition:** Files that pose security, stability, performance, or maintenance risk if modified or if left unfixed

---

## Risk Tier 1 — Critical (Fix Before Production Deploy)

| # | File | Risk Type | Why High Risk |
|---|------|-----------|---------------|
| 1 | `prisma/seed.ts` | **Security** | Hardcoded owner password `"Ahmed@2026"` |
| 2 | `artifacts/api-server/src/app.ts` | **Security** | Open CORS `cors()` — all origins |
| 3 | `server/src/config/env.ts` | **Security** | Dev JWT defaults in source |
| 4 | `server/src/modules/enterprise-notification-engine/notification-engine.service.ts` | **Stability** | Typecheck failures; broken realtime emit |
| 5 | `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | **Stability** | Resolver API mismatch — live monitor route |
| 6 | `artifacts/ecg-insight/components/ecg/viewer/EcgExaminationWorkflowGate.tsx` | **Stability** | Missing `EcgWorkspaceResolvePhase` export |
| 7 | `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | **Stability** | Prop drift — 4 typecheck errors; core workspace |

---

## Risk Tier 2 — High (Clinical / Data Integrity)

| # | File | Risk Type | Why |
|---|------|-----------|-----|
| 8 | `prisma/schema.prisma` | **Data** | 171 models; migration mistakes are irreversible |
| 9 | `server/src/patients/patients.routes.ts` | **Performance/Security** | `take: 5000` unbounded patient load |
| 10 | `server/src/modules/ecg-diagnostic-engine/pipeline.ts` | **Clinical** | Core diagnostic signal pipeline |
| 11 | `server/src/modules/ecg-diagnostic-pipeline/case-orchestrator.ts` | **Clinical** | End-to-end case analysis orchestration |
| 12 | `server/src/modules/ecg-digitization/` | **Clinical** | Image → waveform conversion |
| 13 | `server/src/modules/ecg-measurement/engine.ts` | **Clinical** | Measurement adapter to diagnostic engine |
| 14 | `server/src/modules/ecg-interpretation-engine/` | **Clinical** | Interpretation output drives reports |
| 15 | `server/src/middleware/auth.ts` | **Security** | All protected routes depend on this |
| 16 | `server/src/middleware/api-security.ts` | **Security** | CSRF, rate limits, HMAC; memory leak risk |
| 17 | `server/src/uploads/uploads.routes.ts` | **Security** | File upload attack surface |
| 18 | `server/src/modules/fhir-hl7-interoperability-engine/` | **Compliance** | PHI export (FHIR/HL7) |

---

## Risk Tier 3 — High (Maintenance / Architecture Debt)

| # | File | Risk Type | Why |
|---|------|-----------|-----|
| 19 | `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorShell.tsx` | **Architecture** | Overlay layout; sidebar/canvas overlap |
| 20 | `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorView.tsx` | **Clinical UI** | Waveform display hot path |
| 21 | `artifacts/ecg-insight/components/ecg/viewer/render-engine-2/realtimeEngine.ts` | **Performance** | Hospital realtime rendering |
| 22 | `artifacts/ecg-insight/components/ecg/viewer/rendering-engine/pipeline.ts` | **Performance** | Clinical 12-lead pipeline |
| 23 | `server/src/modules/copilot/copilot.routes.ts` | **Maintainability** | ~1,082 lines — change blast radius |
| 24 | `server/src/modules/medical-intelligence/orchestrator.ts` | **Clinical AI** | AI diagnosis orchestration |
| 25 | `server/src/modules/clinical-decision-support/` | **Clinical** | CDSS recommendations |
| 26 | `server/src/modules/clinical-alerts-risk-engine/` | **Clinical** | Case alerts and risk scores |
| 27 | `package.json` (root) | **Dependencies** | Zod v4 vs catalog v3 split |
| 28 | `pnpm-workspace.yaml` | **Config** | Missing `lib/integrations/*` reference |
| 29 | `scripts/integration/pipeline.mjs` | **CI** | 145 sequential scripts — release bottleneck |
| 30 | `playwright.config.ts` | **CI** | Single worker, zero retries |

---

## Risk Tier 4 — Medium-High (Duplicate / Confusion Risk)

| # | File | Risk Type | Why |
|---|------|-----------|-----|
| 31 | `EcgLiveMonitorGridShell.tsx` | **Confusion** | Broken + unused; developers may wire incorrectly |
| 32 | `EcgViewModeSwitcher.tsx` | **Stability** | Invalid `"monitor"` mode |
| 33 | `clinical-workflow/engine.ts` | **Stability** | Dead `"monitor"` branch |
| 34 | `artifacts/ecg-insight/services/hospital.ts` | **API drift** | Legacy FHIR path |
| 35 | `artifacts/ecg-insight/services/clinicalIntelligence.ts` | **API drift** | Legacy CDSS/timeline |
| 36 | `server/src/modules/hospital-integration/hospital-integration.routes.ts` | **Deprecated** | Legacy FHIR still mounted |
| 37 | `server/src/modules/clinical-intelligence/cdss.service.ts` | **Deprecated** | Parallel CDSS |
| 38 | `enterprise/emkp/` (tree) | **Confusion** | Isolated but looks production-ready |
| 39 | `artifacts/api-server/` (tree) | **Security** | Alternate API with open CORS |
| 40 | `viewer/index.ts` | **Maintainability** | Barrel exports orphans |

---

## Risk Tier 5 — Medium (Large / Hot Path)

| # | File | Risk |
|---|------|------|
| 41 | `useEcgLiveMonitorEngine.ts` | Monitor state machine complexity |
| 42 | `useEcgViewerControls.ts` | Shared zoom/pan/gain — many consumers |
| 43 | `EcgImageCanvas.tsx` | View mode router |
| 44 | `EcgProViewerEngine.tsx` | Image viewer + calipers |
| 45 | `EcgClinicalVisualizationCanvas.tsx` | Waveform viewer |
| 46 | `ecgCaliperGeometry.ts` | Measurement geometry |
| 47 | `ecgMeasurementEngine.ts` (frontend) | Client-side measurements |
| 48 | `useEcgWorkspaceCaseResolver.ts` | Case resolution — API contract |
| 49 | `server/src/cases/cases.routes.ts` | Core case CRUD |
| 50 | `server/src/cases/ecg-viewer-workspace.service.ts` | Workspace persistence |

---

## Top 50 Summary by Risk Category

| Category | Count in Top 50 |
|----------|----------------:|
| Security | 6 |
| Clinical/Data integrity | 12 |
| Stability (typecheck/runtime) | 7 |
| Performance | 5 |
| Architecture/Maintenance | 15 |
| CI/Config | 5 |
| API drift | 5 |

---

## Modification Guidance

| Tier | Guidance |
|------|----------|
| Tier 1 | Fix immediately; require security review for seed/env |
| Tier 2 | Require clinical review + integration tests before merge |
| Tier 3 | Require architecture review; split large files |
| Tier 4 | Deprecate or delete before adding features |
| Tier 5 | Test coverage required before refactor |

---

*Read-only risk assessment. No files modified.*
