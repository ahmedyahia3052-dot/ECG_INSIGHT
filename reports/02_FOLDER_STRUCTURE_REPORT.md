# 02 — Folder Structure Report

**Audit:** Sprint 69 | Read-only

---

## Top-Level Directory Map

| Directory | Purpose | Classification | File Scale |
|-----------|---------|----------------|------------|
| `artifacts/` | Deployable applications | **KEEP** | 3 sub-projects |
| `server/` | Production Express API | **KEEP** | ~440 TS |
| `scripts/` | Integration, QA, sprint runners | **KEEP** | ~184 scripts |
| `tests/` | E2E + unit tests | **KEEP** | ~116 files |
| `lib/` | Shared pnpm packages | **KEEP** | 4 packages |
| `prisma/` | Schema + migrations | **KEEP** | 63 migrations |
| `enterprise/` | EMKP knowledge platform | **Deprecated** | Isolated |
| `ai-engine/` | Python ML service | **KEEP (Future)** | 38 files |
| `mobile/` | Native mobile stub | **KEEP (Future)** | 5 TS |
| `docs/` | Curated documentation | **KEEP** | 3 files |
| `dist/` | Expo web build output | **Safe To Delete** | Generated |
| `uploads/` | Runtime clinical uploads | **Unsafe To Delete** | ~7,928 files |
| `test-results/` | Playwright artifacts | **Safe To Delete** | Generated |
| `playwright-report/` | HTML reports | **Safe To Delete** | Generated |
| `validation-screenshots/` | Visual QA PNGs | **Review Required** | 28 PNGs |
| `.local/` | Replit/local cache | **Safe To Delete** | ~58,010 files |
| `.github/` | CI workflows | **KEEP** | 2 workflows |

---

## `artifacts/ecg-insight/` — Frontend

```
artifacts/ecg-insight/
├── app/                    # Expo Router (47 files)
│   ├── (auth)/
│   ├── (protected)/        # ecg-workspace, ecg-live-monitor, reports, etc.
│   └── (tabs)/
├── components/             # 267 files
│   ├── ecg/                # ★ Core clinical UI
│   │   ├── acquisition/
│   │   └── viewer/         # ~225 files — largest subtree
│   │       ├── rendering-engine/      Sprint 27 clinical 12-lead
│   │       ├── render-engine-2/       Sprint 45 hospital realtime
│   │       ├── live-monitor-hmi/      Hospital HMI chrome
│   │       ├── live-monitor-v2/       Telemetry, HUD utilities
│   │       ├── live-monitor-pro/      Pro HUD, intervals
│   │       ├── live-monitor-audio/    Alarm audio
│   │       ├── hospital-monitor/      Render-engine-2 adapter
│   │       ├── diagnostic-workstation/
│   │       ├── clinical-workflow/
│   │       ├── clinical-visualization/
│   │       ├── clinical-report-engine/
│   │       ├── cdss-workspace/
│   │       └── ai-cardiologist/
│   ├── clinical/, dashboard/, enterprise/, copilot/, ui/, ...
├── services/               # 39 API client modules
├── hooks/                  # 4 files
├── context/                # 3 files
└── assets/, public/, theme/
```

**Naming inconsistency:** `components/bolt/` (legacy Bolt UI) alongside `components/enterprise/`.

**Structural oddity:** `artifacts/ecg-insight/src/` (1 file) coexists with top-level `app/`, `components/`.

---

## `server/src/` — Backend

```
server/src/
├── modules/                # 49 feature modules (368 files) ★
├── auth/                   # Authentication
├── ai/                     # LLM providers, prompts
├── cases/, patients/, users/
├── config/, middleware/, startup/
├── notifications/, realtime/, subscriptions/
├── services/payments/
└── types/, utils/, uploads/, llm/
```

### Server Modules by Domain

| Domain | Modules | Classification |
|--------|---------|----------------|
| ECG core | `ecg-files`, `ecg-digitization`, `ecg-processing`, `ecg-measurement`, `ecg-measurement-engine`, `ecg-diagnostic-engine`, `ecg-diagnostic-pipeline`, `ecg-interpretation`, `ecg-interpretation-engine`, `ecg-longitudinal-timeline-engine`, `ecg-ai-diagnosis`, `ecg-benchmark` | **KEEP** |
| Clinical | `clinical-intelligence`, `clinical-knowledge-engine`, `clinical-alerts-risk-engine`, `clinical-decision-support`, `examination-workflow`, `case-management-engine` | **KEEP** |
| Enterprise | `enterprise`, `enterprise-notification-engine`, `enterprise-rules-engine`, `enterprise-report-engine`, `organization-platform`, `workforce`, `compliance`, `security`, `super-admin` | **KEEP** |
| AI | `copilot`, `ai-overlay`, `ai-report-generator`, `medical-intelligence`, `medical-intelligence-core`, `knowledge`, `knowledge-engine` | **KEEP** / **Duplicate** (MIC vs MI) |
| Interop | `fhir-hl7-interoperability-engine`, `hospital-integration`, `emr`, `ocr` | **KEEP** / **Deprecated** (legacy FHIR) |
| Infra | `audit`, `backup`, `health`, `search`, `support`, `documents`, `preferences`, `release-candidate`, `reports`, `collaboration`, `occupational` | **KEEP** |

---

## `tests/` Structure

| Path | Contents | Count |
|------|----------|------:|
| `tests/e2e/` | Playwright specs (sprint-tagged + smoke) | ~105 |
| `tests/e2e/utils/` | QA helpers, locators | included |
| `tests/unit/ecg/` | Frontend ECG unit tests | ~30 |
| `tests/unit/server/` | Server module tests | 5 |
| `tests/unit/medical-intelligence/` | Confidence engine | 1 |

**Issue:** Many sprint-specific e2e files (`sprint13` through `sprint68`) — overlap risk.

---

## `scripts/` Structure

| Path | Role |
|------|------|
| `scripts/*.integration.ts` | ~134 integration tests |
| `scripts/*.mjs` | Dev stack, Playwright runners, QA pipeline |
| `scripts/integration/pipeline.mjs` | 145-script sequential pipeline |
| `scripts/qa/` | Coverage, accessibility, performance audits |
| `scripts/infrastructure/` | Server health, persistent dev stack |
| `scripts/sprint23/` … `sprint50/` | Sprint-scoped utilities |

---

## Root-Level Clutter

| Pattern | Count | Classification |
|---------|------:|----------------|
| `SPRINT*_*.md`, `*_REPORT.md` | 288 | **Review Required** |
| `*.log` | 26 | **Safe To Delete** |
| `*.traineddata` | 2 | **Review Required** |
| `Dockerfile*` | 5 | **KEEP** |
| `docker-compose*.yml` | 2 | **KEEP** |

---

## Naming Convention Audit

| Pattern | Examples | Verdict |
|---------|----------|---------|
| Sprint docs concatenated | `sprint531`, `sprint335` | Inconsistent |
| Sprint docs underscored | `SPRINT53_1`, `SPRINT33_5` | Inconsistent |
| Module pairs | `ecg-interpretation` / `ecg-interpretation-engine` | Intentional layering |
| PascalCase components | `EcgLiveMonitorShell.tsx` | Standard React |
| kebab-case folders | `live-monitor-hmi` | Standard |
| Duplicate doc names | `API_SPEC.md` vs `API_SPECIFICATION.md` | **Duplicate** |
| PascalCase report | `InfrastructureReport.md` | Inconsistent |

---

## Orphan / Low-Integration Folders

| Path | Why Orphan | Classification |
|------|------------|----------------|
| `mobile/` (root) | 5 files; separate from `components/mobile/` | **KEEP (Future)** |
| `enterprise/emkp/` | README: not integrated with production | **Deprecated** |
| `artifacts/api-server/` | Alternate Drizzle API | **Review Required** |
| `artifacts/mockup-sandbox/` | UI sandbox only | **KEEP (Future)** |
| `lib/integrations/*` | Declared in pnpm workspace, missing | **Broken** (config) |
| `attached_assets/` | Single Replit asset | **Review Required** |
| `benchmark-data/` | Minimal stub | **KEEP (Future)** |

---

## Recommended Folder Mental Model

```
KEEP (production):
  artifacts/ecg-insight/  → UI
  server/                 → API
  prisma/                 → DB
  tests/ + scripts/       → QA

REVIEW:
  lib/ + artifacts/api-server/  → Drizzle stack fate
  enterprise/emkp/              → integrate or archive

SAFE TO DELETE (generated):
  dist/, test-results/, playwright-report/, .local/, *.log

UNSAFE TO DELETE:
  uploads/, prisma/migrations/
```

---

*Read-only. No folders modified.*
