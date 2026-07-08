# Rule Engine Report — Sprint 44

## Implementation

**File:** `artifacts/ecg-insight/components/ecg/viewer/cdss-workspace/clinicalRuleEngine.ts`

Deterministic evaluation against structured cardiologist model + analysis text + manual measurements.

## Supported Rules (31)

| Category | Rules |
|----------|-------|
| Rhythm | Normal ECG, Sinus Rhythm, Sinus Bradycardia, Sinus Tachycardia, AF, Flutter, PAC, PVC |
| Conduction | 1° AV Block, 2° AV Block, Complete Heart Block, RBBB, LBBB |
| Axis | Left Axis Deviation, Right Axis Deviation |
| Hypertrophy | LVH, RVH |
| Repolarization | Early Repolarization, QT Prolongation, Short QT |
| Pre-excitation | WPW, Brugada Pattern |
| Inflammatory | Pericarditis |
| Electrolytes | Hyperkalemia, Hypokalemia |
| Vascular | Pulmonary Embolism Pattern |
| Ischemia | Anterior/Inferior/Lateral STEMI, Posterior MI Suspicion, NSTEMI Suspicion |

## Rule Output

Each matched rule returns:
- Diagnosis label
- Confidence (0–100)
- Severity (normal → life_threatening)
- Explainable evidence (leads, measurements, morphology, axis, rhythm)
- Supporting and contradicting findings

## Evaluation Logic

Rules combine:
- Numeric thresholds (HR, PR, QRS, QTc, axis degrees)
- ST analysis lead patterns from cardiologist model
- Text pattern matching on AI diagnosis/interpretation
- Manual measurement enrichment when calipers present

## Functions

- `evaluateClinicalRules(context)` — evaluate all rules
- `matchedRules(rules)` — filter and sort by confidence
- `highestSeverity(rules)` — aggregate severity for triage
