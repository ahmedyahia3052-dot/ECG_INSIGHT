# Sprint 64 — ECG Clinical Alerts & Risk Stratification Engine Report

**Date:** 2026-07-08  
**Tag:** `Sprint64_Clinical_Alerts_Risk_Engine`  
**Scope:** Backend-only — zero UI changes

---

## Objective

Build a complete enterprise ECG Clinical Alert & Risk Stratification Engine with automatic detection of 15 clinical alert patterns, risk scoring, audit logging, and REST API — without modifying any frontend files.

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Clinical Alerts & Risk Engine module | ✅ |
| 15 automated alert detectors | ✅ |
| Risk stratification (score, category, priority, urgency, confidence) | ✅ |
| Extended `ECGClinicalAlert` + new persistence models | ✅ |
| Audit trail (`ECGAlertHistory` + `AuditLog`) | ✅ |
| REST API (`/api/clinical-alerts-risk-engine`) | ✅ |
| Unit tests | ✅ |
| Integration marker tests | ✅ |
| Migration | ✅ |

---

## Architecture

```
ECG Case + Measurements + Medical Intelligence
        ↓
detectClinicalAlerts() — 15 rule-based detectors
        ↓
calculateRiskAssessment() — weighted severity scoring
        ↓
Persist:
  ECGClinicalAlert (extended, sourceEngine tagged)
  ECGRiskAssessment + ECGRiskFactor
  ECGAlertHistory + AuditLog
        ↓
API: GET alerts · GET risk · POST recalculate
```

---

## Database Models

| Model | Purpose |
|-------|---------|
| `ECGClinicalAlert` (extended) | Sprint 64 alerts with `alertCode`, `alertSeverity`, evidence, engine version |
| `ECGRiskAssessment` | Versioned case risk score with category, priority, urgency |
| `ECGRiskFactor` | Weighted contributing factors per assessment |
| `ECGAlertHistory` | Audit log for alert generation and risk recalculation |

**Enums:** `EcgAlertSeverity`, `EcgAlertCode`, `EcgAlertStatus`, `EcgRiskCategory`, `EcgClinicalPriority`, `EcgUrgencyLevel`, `EcgAlertHistoryEventType`

---

## Alert Detection (15 Patterns)

| Code | Pattern |
|------|---------|
| `CRITICAL_QT_PROLONGATION` | QTc > 470/480 ms (critical > 500) |
| `BRADYCARDIA` | HR < 60 bpm |
| `TACHYCARDIA` | HR > 100 bpm |
| `ATRIAL_FIBRILLATION` | Irregular rhythm / AF rule finding |
| `ATRIAL_FLUTTER` | Flutter pattern / AFL finding |
| `ST_ELEVATION` | ST deviation > 1 mm |
| `ST_DEPRESSION` | ST deviation < -0.5 mm |
| `WIDE_QRS` | QRS > 120 ms |
| `EXTREME_AXIS` | Axis outside ±90° |
| `HIGH_PVC_BURDEN` | PVC/VT ectopy patterns |
| `POSSIBLE_AV_BLOCK` | PR > 200 ms / high-grade block |
| `BUNDLE_BRANCH_BLOCK` | Wide QRS + BBB finding |
| `POSSIBLE_ACUTE_MI` | STEMI/ischemia / pathological Q |
| `POSSIBLE_HYPERKALEMIA` | Peaked T + wide QRS |
| `POSSIBLE_HYPOKALEMIA` | Long QT + flat T waves |

**Severity:** NORMAL · LOW · MODERATE · HIGH · CRITICAL

---

## Risk Engine

| Output | Description |
|--------|-------------|
| Risk Score | 0–100 weighted by alert severity × confidence |
| Risk Category | LOW (0–20) · MODERATE (21–45) · HIGH (46–75) · CRITICAL (76+) |
| Clinical Priority | ROUTINE · ELEVATED · HIGH · CRITICAL |
| Urgency | ROUTINE · URGENT · EMERGENT · CRITICAL |
| Confidence | Blend of alert + measurement confidence |
| Supporting Findings | Top alert summaries + severity context |
| Risk Factors | Per-alert weighted contributions |

---

## API Endpoints

Base: `/api/clinical-alerts-risk-engine`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/health` | Public | Service health |
| `GET` | `/alerts/:caseId` | Authenticated | Active alerts (auto-generates if none) |
| `GET` | `/risk/:caseId` | Authenticated | Latest risk assessment |
| `POST` | `/risk/recalculate/:caseId` | DOCTOR, ADMIN, SUPER_ADMIN | Regenerate alerts + new risk version |
| `GET` | `/audit/:caseId` | Authenticated | Alert/risk audit history |

---

## Audit

- `ECGAlertHistory` records `ALERT_GENERATED`, `RISK_CALCULATED`, `RISK_RECALCULATED`
- `AuditLog` records `ECG_ALERT_ENGINE_GENERATED`, `ECG_RISK_ENGINE_RECALCULATED`, `RISK_ASSESSMENT_COMPLETED`

---

## Module Files

```
server/src/modules/clinical-alerts-risk-engine/
├── alert-engine.ts
├── risk-engine.ts
├── repository.ts
├── clinical-alerts-risk.service.ts
├── clinical-alerts-risk.routes.ts
├── audit.ts
├── schemas.ts
├── types.ts
└── index.ts
```

---

## Migration

`prisma/migrations/20260708070000_sprint64_clinical_alerts_risk_engine/migration.sql`

---

## Tests

- `scripts/sprint64-clinical-alerts-risk-engine.test.ts`
- `scripts/sprint64-clinical-alerts-risk-engine.integration.ts`

---

## Preserved (Zero Changes)

ECG Workspace, Viewer, Live Monitor, Rendering Engine, Canvas, Sidebar, Toolbar, Layout, all React UI.

---

## Tag

`Sprint64_Clinical_Alerts_Risk_Engine`
