# 06 — Dependency Graph

**Audit:** Sprint 69 | Read-only

---

## Package Dependency Graph

```mermaid
flowchart TB
  subgraph npm_root["Root (npm) — workspace@0.0.0"]
    ROOT_DEPS["express, prisma, react, expo, zod@4, playwright, vitest"]
  end

  subgraph pnpm_ws["pnpm workspace packages"]
    ECG["@workspace/ecg-insight"]
    API_SRV["@workspace/api-server"]
    MOCK["@workspace/mockup-sandbox"]
    API_CLIENT["@workspace/api-client-react"]
    API_SPEC["@workspace/api-spec"]
    API_ZOD["@workspace/api-zod"]
    DB["@workspace/db"]
    SCRIPTS["@workspace/scripts"]
  end

  subgraph no_pkg["No package.json"]
    SERVER["server/ — Primary API"]
  end

  ROOT_DEPS --> SERVER
  ROOT_DEPS --> ECG
  ECG --> API_CLIENT
  ECG --> API_ZOD
  API_SRV --> DB
  API_SRV --> API_ZOD
  API_CLIENT --> API_SPEC
  API_ZOD --> API_SPEC
  SCRIPTS --> ROOT_DEPS
```

---

## Runtime Dependency Flow (Production)

```mermaid
flowchart LR
  Browser["Browser / Expo Web"]
  UI["artifacts/ecg-insight"]
  API["server/ Express"]
  DB["PostgreSQL via Prisma"]
  Uploads["uploads/ filesystem"]

  Browser --> UI
  UI -->|"fetch /api/v1"| API
  API --> DB
  API --> Uploads
```

---

## ECG Clinical Pipeline (Server)

```mermaid
flowchart TD
  EP["ecg-processing routes"]
  DIG["ecg-digitization"]
  DE["ecg-diagnostic-engine"]
  ME["ecg-measurement-engine"]
  EM["ecg-measurement (legacy adapter)"]
  IE["ecg-interpretation-engine"]
  IL["ecg-interpretation (legacy)"]
  MI["medical-intelligence"]
  AI["ecg-ai-diagnosis"]
  DP["ecg-diagnostic-pipeline"]
  ER["enterprise-report-engine"]
  AR["ai-report-generator"]

  EP --> DIG
  EP --> DE
  DP --> DE
  DP --> ME
  DP --> IE
  DP --> MI
  DP --> AR
  DP --> ER
  DE --> EM
  IE --> IL
  ME --> EM
```

---

## Frontend Viewer Dependency Graph

```mermaid
flowchart TD
  R1["/ecg-workspace"]
  R2["/ecg-live-monitor"]
  EWS["EcgEnterpriseWorkspaceScreen"]
  LMS["EcgLiveMonitorWorkspaceScreen"]
  MVF["EcgMonitorViewerFoundation"]
  LMShell["EcgLiveMonitorShell"]
  EIC["EcgImageCanvas"]
  PVE["EcgProViewerEngine"]
  CVC["EcgClinicalVisualizationCanvas"]
  RE2["render-engine-2"]
  LMV["EcgLiveMonitorView"]
  HMI["live-monitor-hmi/"]

  R1 --> EWS --> MVF
  R2 --> LMS --> LMShell
  MVF --> EIC
  EIC -->|waveform| CVC
  EIC -->|image| PVE
  LMShell --> LMV
  LMShell --> HMI
  LMV --> RE2
```

---

## Cross-Module Import Hotspots

| Module | Imported By (count) | Role |
|--------|---------------------|------|
| `ecg-diagnostic-engine` | measurement, pipeline, processing | Core signal analysis |
| `ecg-processing` routes | Frontend `ecgProcessing.ts` | HTTP facade |
| `medical-intelligence` | pipeline, frontend MI service | AI orchestration |
| `clinical-knowledge-engine` | interpretation-engine bridge | Diagnosis catalog |
| `render-engine-2` | hospital-monitor, live monitor view | Realtime waveform |
| `live-monitor-hmi` | EcgLiveMonitorShell | Hospital chrome |

---

## External Dependencies (Key)

| Package | Version | Used By | Risk |
|---------|---------|---------|------|
| `express` | ^5.2.1 | server, api-server | Low |
| `@prisma/client` | ^7.4.2 | server | Low |
| `zod` | ^4.4.3 (root) / ^3.25 (catalog) | server vs lib | **High** |
| `react` | ^19.1.0 | ecg-insight | Low |
| `expo` | ~54.x | ecg-insight | Medium (upgrade cadence) |
| `playwright` | ^1.61.1 | tests | Low |
| `vitest` | ^3.x | unit tests | Low |
| `argon2` + `bcryptjs` | both present | auth crypto | Medium (consolidate) |

---

## Orphan Dependency Nodes (No Upstream Consumers)

| Node | Status |
|------|--------|
| `EcgLiveMonitorGridShell` | No importers |
| `EcgReadingStationLayout` | No importers |
| `EcgRenderingEngineView` | No importers |
| `enterprise/emkp/*` | Test-only |
| `artifacts/api-server` | Not in production CI path |
| `lib/integrations/*` | Missing directory |

---

## CI Dependency Chain

```
npm ci
  → prisma:generate
  → npm run typecheck (server + ecg-insight)
  → npm run lint (scoped)
  → vitest (narrow coverage)
  → scripts/integration/pipeline.mjs (145 scripts sequential)
  → playwright (1 worker, global-setup starts servers)
```

**Bottleneck:** Sequential integration pipeline + single Playwright worker.

---

## Recommended Dependency Simplification

1. Move `server/` into pnpm workspace OR remove pnpm workspace entirely.
2. Unify Zod to v4 across all packages.
3. Archive Drizzle subgraph (`lib/db`, `api-server`) if unused in production.
4. Prune barrel exports in `viewer/index.ts` to reflect actual graph.
5. Document canonical import paths in `ARCHITECTURE.md`.

---

*Read-only dependency analysis.*
