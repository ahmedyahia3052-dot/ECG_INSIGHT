# Medical Reference Index — EMKP

Quick-reference index for all EMKP knowledge assets.

---

## Disease Index (47 entries)

| Code | Name | Category | Severity | Urgency |
|------|------|----------|----------|---------|
| NORMAL_ECG | Normal ECG | normal | normal | routine |
| NSR | Sinus Rhythm | rhythm | normal | routine |
| SBRAD | Sinus Bradycardia | rhythm | minor | routine |
| STACH | Sinus Tachycardia | rhythm | minor | routine |
| AF | Atrial Fibrillation | rhythm | abnormal | urgent |
| AFL | Atrial Flutter | rhythm | abnormal | urgent |
| SVT | Supraventricular Tachycardia | rhythm | urgent | urgent |
| AVNRT | AV Nodal Reentrant Tachycardia | rhythm | urgent | urgent |
| AVRT | AV Reentrant Tachycardia | rhythm | urgent | urgent |
| PAC | Premature Atrial Contraction | rhythm | minor | routine |
| PVC | Premature Ventricular Contraction | rhythm | minor | routine |
| VT | Ventricular Tachycardia | rhythm | critical | critical |
| VF | Ventricular Fibrillation | rhythm | critical | critical |
| ASYSTOLE | Asystole | rhythm | critical | critical |
| PEA | Pulseless Electrical Activity | rhythm | critical | critical |
| AVB1 | First Degree AV Block | conduction | minor | routine |
| AVB2I | Second Degree AV Block Type I | conduction | abnormal | urgent |
| AVB2II | Second Degree AV Block Type II | conduction | urgent | urgent |
| AVB3 | Third Degree AV Block | conduction | critical | critical |
| RBBB | Right Bundle Branch Block | conduction | abnormal | routine |
| LBBB | Left Bundle Branch Block | conduction | abnormal | routine |
| LAFB | Left Anterior Fascicular Block | conduction | minor | routine |
| LPFB | Left Posterior Fascicular Block | conduction | abnormal | routine |
| LVH | Left Ventricular Hypertrophy | hypertrophy | abnormal | routine |
| RVH | Right Ventricular Hypertrophy | hypertrophy | abnormal | urgent |
| STEMI | ST-Elevation MI | ischemia | critical | critical |
| NSTEMI | Non-ST-Elevation MI | ischemia | urgent | urgent |
| ANT_MI | Anterior MI | ischemia | critical | critical |
| INF_MI | Inferior MI | ischemia | critical | critical |
| LAT_MI | Lateral MI | ischemia | urgent | urgent |
| POST_MI | Posterior MI | ischemia | critical | critical |
| HYPERK | Hyperkalemia | electrolyte | urgent | urgent |
| HYPOK | Hypokalemia | electrolyte | abnormal | urgent |
| HYPERCAL | Hypercalcemia | electrolyte | abnormal | routine |
| HYPOCAL | Hypocalcemia | electrolyte | abnormal | routine |
| PERICARDITIS | Pericarditis | other | abnormal | urgent |
| EARLY_REPOL | Early Repolarization | other | normal | routine |
| WPW | Wolff-Parkinson-White | conduction | abnormal | urgent |
| LONG_QT | Long QT Syndrome | channelopathy | urgent | urgent |
| SHORT_QT | Short QT Syndrome | channelopathy | abnormal | urgent |
| BRUGADA | Brugada Syndrome | channelopathy | urgent | urgent |
| ARVC | Arrhythmogenic RV Cardiomyopathy | structural | urgent | urgent |
| PACEMAKER | Pacemaker Rhythms | device | minor | routine |
| BBB_ESCAPE | Bundle Branch Escape | rhythm | critical | critical |
| JUNCTIONAL | Junctional Rhythm | rhythm | abnormal | routine |
| IVR | Idioventricular Rhythm | rhythm | critical | critical |
| AIVR | Accelerated Idioventricular Rhythm | rhythm | abnormal | routine |

---

## Rule Index

Rules `EMKP-R-001` through `EMKP-R-047` — one per disease. See [CLINICAL_RULE_ENGINE.md](./CLINICAL_RULE_ENGINE.md).

---

## Lead Index

I · II · III · aVR · aVL · aVF · V1 · V2 · V3 · V4 · V5 · V6

See [ECG_KNOWLEDGE_ARCHITECTURE.md](./ECG_KNOWLEDGE_ARCHITECTURE.md) Phase 6.

---

## Guideline Index

10 documents from ESC, AHA, ACC/AHA, UDMI, IEC, WHF, HRS. See [GUIDELINE_MAPPING.md](./GUIDELINE_MAPPING.md).

---

## Differential Tree Index

6 root trees: ST Elevation · ST Depression · Tachycardia · Bradycardia · Wide QRS · QT Abnormality

See [DIFFERENTIAL_DIAGNOSIS.md](./DIFFERENTIAL_DIAGNOSIS.md).

---

## Terminology Index

43+ entries across waves, intervals, segments, axis, morphology, rhythm, abbreviations, clinical terms.

See [ECG_TERMINOLOGY.md](./ECG_TERMINOLOGY.md).

---

## File Index

| File | Purpose |
|------|---------|
| `enterprise/emkp/src/index.ts` | Module exports |
| `enterprise/emkp/src/knowledge/diagnoses.ts` | Disease catalog |
| `enterprise/emkp/src/rules/clinical-rules.ts` | Rule catalog |
| `enterprise/emkp/src/differential/trees.ts` | Differential trees |
| `enterprise/emkp/src/knowledge/leads.ts` | Lead knowledge |
| `enterprise/emkp/src/knowledge/terminology.ts` | Dictionary |
| `enterprise/emkp/src/guidelines/registry.ts` | Guideline mapping |
| `enterprise/emkp/database/schema.sql` | Database DDL |
| `enterprise/emkp/api/openapi.yaml` | Future API spec |
| `scripts/emkp-validation.test.ts` | Validation tests |

---

## Validation Command

```bash
npx tsx scripts/emkp-validation.test.ts
```
