# Rule Engine Specification

## Overview

The deterministic rule engine evaluates ECG measurements and produces concurrent clinical findings. Rules are pure functions with no side effects, enabling full reproducibility and clinical validation.

**Source:** `server/src/modules/medical-intelligence/rule-engine/rules.ts`

---

## Input Parameters

| Parameter | Source Field | Unit |
|-----------|-------------|------|
| Heart Rate | `measurement.heartRate` | bpm |
| PR Interval | `measurement.intervals.prIntervalMs` | ms |
| QRS Duration | `measurement.intervals.qrsDurationMs` | ms |
| QT Interval | `measurement.intervals.qtIntervalMs` | ms |
| QTc (Bazett) | `measurement.intervals.qtcBazettMs` | ms |
| QTc (Fridericia) | `measurement.intervals.qtcFridericiaMs` | ms |
| RR Interval | `measurement.intervals.rrIntervalMs` | ms |
| Mean QRS Axis | `measurement.axis.meanQrsAxisDeg` | degrees |
| ST Deviation | `measurement.amplitudes.stDeviationMm` | mm |
| T Wave Amplitude | `measurement.amplitudes.tWaveAmplitudeMv` | mV |
| Rhythm | `measurement.rhythm` | enum |
| Morphology Flags | `measurement.morphology` | flags |

---

## Rule Categories

### Rhythm Rules (RHY-001 – RHY-012)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| RHY-001 | Normal Sinus Rhythm | HR 60–100, regular, sinus_rhythm |
| RHY-002 | Sinus Bradycardia | HR <60, regular, ≥40 bpm |
| RHY-003 | Sinus Tachycardia | HR >100, regular, <150 bpm |
| RHY-004 | Atrial Fibrillation | Irregular rhythm, HR ≥90 |
| RHY-005 | Atrial Flutter | Irregular, HR 130–170 |
| RHY-006 | PAC | Irregular, narrow QRS, HR <130 |
| RHY-007 | PVC | Irregular, wide QRS |
| RHY-008 | SVT | Regular, HR ≥150, narrow QRS |
| RHY-009 | Ventricular Tachycardia | Regular, wide QRS, HR 100–250 |
| RHY-010 | Ventricular Fibrillation | HR ≤5, chaotic |
| RHY-011 | Asystole | HR ≤5, minimal QRS |
| RHY-012 | PEA | Organized rhythm, wide QRS, HR 20–60 |

### Conduction Rules (CON-001 – CON-009)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| CON-001 | First Degree AV Block | PR ≥200 ms |
| CON-002 | Second Degree AV Block Type I | PR ≥180 ms + irregular |
| CON-003 | Second Degree AV Block Type II | PR ≥200 ms + wide QRS + bradycardia |
| CON-004 | Third Degree AV Block | PR ≥220 ms + HR <45 |
| CON-005 | RBBB | QRS ≥120 ms + axis ≥0° |
| CON-006 | LBBB | QRS ≥120 ms + axis <0° |
| CON-007 | Bifascicular Block | Wide QRS + LAD |
| CON-008 | Trifascicular Block | Wide QRS + prolonged PR + axis deviation |
| CON-009 | WPW | PR <120 ms + wide QRS |

### Ischemia Rules (ISC-001 – ISC-004)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| ISC-001 | STEMI | ST elevation ≥1 mm |
| ISC-002 | NSTEMI | ST depression ≤−0.5 mm |
| ISC-003 | Early Repolarization | ST 0.5–1 mm concave |
| ISC-004 | Pericarditis | Diffuse ST elevation pattern |

### Electrolyte Rules (ELE-001 – ELE-006)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| ELE-001 | Hyperkalemia | Peaked T + wide QRS |
| ELE-002 | Hypokalemia | Prolonged QT + ST flattening |
| ELE-003 | Long QT | QTc >470 ms |
| ELE-004 | Short QT | QTc ≤340 ms |
| ELE-005 | Hypocalcemia | Prolonged QTc, low T amplitude |
| ELE-006 | Electrolyte Disorder | General pattern match |

### Hypertrophy Rules (HYP-001 – HYP-003)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| HYP-001 | LVH | lvh_criteria morphology flag |
| HYP-002 | RVH | rvh_criteria morphology flag |
| HYP-003 | Hypertrophy (Unspecified) | Any hypertrophy criteria met |

### Special Rules (SPC-001 – SPC-003)

| Rule ID | Diagnosis | Key Criteria |
|---------|-----------|--------------|
| SPC-001 | Pulmonary Embolism | Tachycardia + RAD + wide QRS |
| SPC-002 | Brugada | ST ≥2 mm + low T wave |
| SPC-003 | Pacemaker Rhythm | Wide QRS without P waves |

---

## Concurrent Findings

Rules are evaluated independently. All matching rules fire simultaneously. Example: a tracing with prolonged PR + wide QRS + left axis produces AVB1 + LBBB + Bifascicular Block concurrently.

Findings are ranked by severity (critical > urgent > abnormal > minor > normal), then by raw confidence.

---

## Rule Output Schema

```typescript
interface RuleFinding {
  code: MedicalDiagnosisCode;
  label: string;
  category: string;
  severity: ClinicalSeverity;
  urgency: ClinicalUrgency;
  ruleId: string;
  triggeredBy: string[];
  evidence: RuleEvidence[];
  rawConfidence: number;  // 0.0 – 0.98
}
```

---

## Validation

- Unit tests: `scripts/medical-intelligence-engine.test.ts`
- Integration: `scripts/medical-intelligence-engine.integration.ts`
- Clinical scenarios validated: NSR, AF, STEMI, Bradycardia, concurrent multi-category findings

---

## Extending Rules

1. Add diagnosis to `knowledge-base/diagnosis-factory.ts`
2. Add rule function in appropriate category in `rule-engine/rules.ts`
3. Add rule definition to `listRuleDefinitions()`
4. Add recommendation mapping in `recommendations/engine.ts`
5. Add test case in `scripts/medical-intelligence-engine.test.ts`
