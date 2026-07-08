# Knowledge Base Report — Sprint 40 MIC

## Summary

Sprint 40 delivers a production-structured **ECG Diagnosis Knowledge Base** and companion libraries for the Medical Intelligence Core. All entries use real clinical content — no placeholder lorem or fake codes.

## Module 1 — Diagnosis Catalog

**Location:** `server/src/modules/medical-intelligence-core/data/diagnoses.ts`

Each diagnosis includes all required Sprint 40 fields:

| Field | Status |
|-------|--------|
| Name | ✅ |
| Category | ✅ rhythm, arrhythmia, conduction, ischemia, hypertrophy |
| Definition | ✅ |
| ECG Diagnostic Criteria | ✅ |
| Typical ECG Findings | ✅ |
| Clinical Significance | ✅ |
| Differential Diagnosis | ✅ |
| Possible Causes | ✅ |
| Associated Symptoms | ✅ |
| Severity | ✅ normal → critical |
| Emergency Level | ✅ routine → critical |
| Recommended Next Steps | ✅ |
| References | ✅ ESC / ACC/AHA / AHA |
| ICD-10 placeholder | ✅ |
| SNOMED placeholder | ✅ |

**Catalog size:** 26 diagnoses covering rhythm, arrhythmia, conduction blocks, full STEMI territories, NSTEMI, ST depression, T-wave changes, and LVH.

## Module 2 — Arrhythmia Library

**12 entities:** Sinus Rhythm, Sinus Bradycardia, Sinus Tachycardia, AF, Flutter, SVT, VT, VF, PAC, PVC, AV Blocks, Bundle Branch Blocks.

Each entity links to a diagnosis code and includes key features, emergency level, and treatment notes.

## Module 3 — STEMI / Ischemia Library

**9 entities:** Anterior, Inferior, Lateral, Posterior, Septal, Right Ventricular, NSTEMI, ST Depression, T Wave Changes.

Each includes affected leads, ST criteria, territory (where applicable), and linked diagnosis code.

## Module 4 — Measurement Reference

**8 parameters:** PR, QRS, QT, QTc, Heart Rate, Axis, Voltage, Hypertrophy (Sokolow-Lyon, Cornell, RVH, atrial enlargement criteria).

## Module 5 — Recommendation Engine

Maps diagnoses to structured recommendations:

- Repeat ECG
- Troponin (serial)
- Echo
- Holter
- Cardiology referral
- Emergency transfer
- Electrolytes
- Continuous monitoring
- Observation
- Anticoagulation review

## Module 6 — Differential Engine

Structured finding codes (e.g. `ST_ELEVATION`, `IRREGULAR_RHYTHM`, `WIDE_QRS_TACHYCARDIA`) map to ranked differentials with confidence scores and distinguishing features.

## Module 7 — Risk Stratification

Six configurable rules produce **low**, **intermediate**, **high**, or **critical** levels from diagnosis category, severity, and emergency level.

## Module 8 — Guideline Registry

Six guidelines from **ESC**, **ACC/AHA**, and **AHA** with version/year metadata and category applicability for future guideline-version expansion.

## Extensibility

Add entries in `data/*.ts`, run `POST /api/mic/seed` to upsert normalized database rows. Runtime lookups read from in-memory catalogs for deterministic integration tests.
