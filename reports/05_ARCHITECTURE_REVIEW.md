# 05 — Architecture Review

**Audit:** Sprint 69 | Read-only

---

## Architecture Grade: **C+** (Functional but layered)

The system delivers a comprehensive clinical ECG platform but carries **multiple architectural generations** without clear deprecation boundaries.

---

## Layered Architecture (As-Built)

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation (Expo Router + React Native Web)                │
│  • Workspace orchestrator: EcgMonitorViewerFoundation        │
│  • Live monitor: EcgLiveMonitorShell (overlay layout)        │
│  • 281 viewer files, 3 render paths                          │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST JSON /api/v1
┌────────────────────────▼─────────────────────────────────────┐
│ API Gateway (Express 5)                                      │
│  • Auth: JWT + session DB + CSRF + HMAC                      │
│  • 49 modules mounted at /api/v1                             │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Domain / Pipeline Layer                                      │
│  Digitize → Diagnostic Engine → Measurement → Interpretation │
│  → Medical Intelligence → AI Report → Enterprise Report      │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Persistence (Prisma 7 + PostgreSQL, 171 models)            │
└──────────────────────────────────────────────────────────────┘
```

---

## Domain Architecture Assessment

### Workspace & Viewer — **B**

| Strength | Weakness |
|----------|----------|
| Single foundation (`EcgMonitorViewerFoundation`) | Orphan Sprint 53 reading station |
| Clear view-mode routing in `EcgImageCanvas` | 12 typecheck errors from prop drift |
| Resizable grid workspace | Legacy `EcgWorkspaceViewer` still in tree |

### Live Monitor — **B-**

| Strength | Weakness |
|----------|----------|
| Rich HMI layers (hmi, pro, v2, audio) | Overlay layout vs grid shell conflict |
| Dedicated engine (`useEcgLiveMonitorEngine`) | Multiple unused shell variants |
| Hospital render via `render-engine-2` | Sidebar rebuilt multiple times |

### Rendering Engine — **B+**

| Strength | Weakness |
|----------|----------|
| Two engines for distinct use cases | Three canvas entry points |
| WebGL + realtime paths tested | Cross-imports between v2 and engine-2 |

### Diagnostic Engine — **A-**

| Strength | Weakness |
|----------|----------|
| Clean Sprint 54 pipeline module | Legacy adapter still required |
| Sprint 61 orchestrator | Frontend not fully wired to studio APIs |

### AI & Medical Intelligence — **B**

| Strength | Weakness |
|----------|----------|
| Multiple AI surfaces (overlay, copilot, MI) | Overlapping responsibilities |
| Versioned overlay format | `medical-intelligence` vs `medical-intelligence-core` |

### Clinical Intelligence (CDSS, Alerts, Risk) — **C+**

| Strength | Weakness |
|----------|----------|
| Sprint 64–65 modules exist | Frontend still on legacy `/cdss` |
| Case + patient alert separation | Three parallel alert systems |

### Interop (FHIR/HL7) — **C**

| Strength | Weakness |
|----------|----------|
| Sprint 68 interop engine | Legacy `/fhir` still used by frontend |
| HL7 ORU/ORM builders | No frontend HL7 client |

### Enterprise Platform — **B-**

| Strength | Weakness |
|----------|----------|
| Rules, notifications, reports engines | 171 Prisma models — many lightly used |
| Workforce, compliance, security wired | Schema/model overlap (Session/UserSession) |

---

## Architecture Violations

| Violation | Location | Severity |
|-----------|----------|----------|
| **Dual persistence stacks** | Prisma + Drizzle coexist | High |
| **Dual package managers** | npm root + pnpm workspace | Medium |
| **Zod v3/v4 split** | Root vs catalog packages | High |
| **Client-side CDSS rules** | `clinicalRuleEngine.ts` duplicates server | Medium |
| **Monolithic route files** | `copilot.routes.ts` (~1,082 lines) | Medium |
| **Monolithic page** | `ecg-live-monitor.tsx` (~1,974 lines) | Medium |
| **server/ outside workspace** | Not in pnpm packages | Low |
| **Barrel export orphans** | `viewer/index.ts` exports unused components | Low |

---

## Circular Dependency Risk

No hard circular import cycles confirmed in audit. **Soft coupling risks:**

| From | To | Risk |
|------|-----|------|
| `ecg-interpretation-engine` | `ecg-interpretation` (legacy) | Adapter permanence |
| `ecg-measurement` | `ecg-diagnostic-engine` | Pipeline entanglement |
| `render-engine-2` | `live-monitor-v2` markers | Cross-generation dependency |
| `notification-center` | `enterprise-notification-engine` | Layered, acceptable |

---

## API Versioning & Drift

| New API (Server) | Legacy API (Still Called) | Frontend Service |
|------------------|---------------------------|------------------|
| `/interop/fhir/*` | `/fhir/export` | `hospital.ts` |
| `/clinical-decision-support/*` | `/cdss/cases/:id/evaluate` | `clinicalIntelligence.ts` |
| `/clinical-alerts-risk-engine/*` | `/clinical-alerts` | `clinicalIntelligence.ts` |
| `/patients/:id/timeline` | `/longitudinal-ecg/` | `clinicalIntelligence.ts` |

**Recommendation:** API deprecation policy with sunset dates.

---

## Scalability Assessment

| Area | Current | Concern |
|------|---------|---------|
| API | Single Express process | Horizontal scaling needs session store review |
| DB | 171 models, some unbounded queries | Pagination gaps |
| QA | 145 sequential integration scripts | CI bottleneck |
| Frontend | Canvas/WebGL rendering | Client memory on 4K viewports |
| Realtime | SSE loops in LLM providers | Connection lifecycle |

---

## Security Architecture — **B**

Strengths: `requireAuth`, CSRF, input sanitizer, production env validation.  
Weaknesses: legacy API open CORS, in-memory rate limit maps, seed credentials in repo.

---

## Recommended Target Architecture (Future)

```
UI Layer
  ├── WorkspaceModule (viewer foundation only)
  ├── LiveMonitorModule (single shell — grid OR overlay, not both)
  └── SharedViewerCore (controls, types, tokens)

API Layer
  ├── EcgPipelineService (single orchestrator)
  ├── ClinicalIntelligenceService (unified CDSS/alerts/risk)
  ├── InteropService (FHIR/HL7 only)
  └── KnowledgeService (unified catalog)

Data Layer
  └── Prisma only (archive Drizzle stack)
```

---

## Classification by Module

| Module | Classification |
|--------|----------------|
| `ecg-diagnostic-engine` | **KEEP** |
| `ecg-diagnostic-pipeline` | **KEEP** |
| `ecg-interpretation` | **Deprecated** (adapter) |
| `ecg-interpretation-engine` | **KEEP** |
| `fhir-hl7-interoperability-engine` | **KEEP** |
| `hospital-integration` (FHIR) | **Deprecated** |
| `enterprise/emkp` | **Deprecated** |
| `artifacts/api-server` | **Review Required** |
| `EcgLiveMonitorGridShell` | **Duplicate** |
| `EcgReadingStationLayout` | **Unused** |

---

*Read-only architecture review. No changes made.*
