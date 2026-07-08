# ECG Clinical Validation Report

Project: ECG Insight Enterprise Medical AI Platform  
Scope: clinical audit of ECG ingestion, digitization, feature extraction, diagnosis generation, explainability, and validation readiness.

## Executive Clinical Conclusion

The current ECG analysis engine is not validated real AI in the regulatory or clinical performance sense. It is a hybrid engineering prototype: deterministic waveform/image processing plus a rule-based diagnosis engine, with an optional deep-learning adapter that only becomes real model inference if `AI_MODEL_ENDPOINT` is configured and returns valid results. In the default configuration, `AI_PROVIDER` is `rule_based`.

No evidence was found of an adjudicated ECG dataset, external benchmark corpus, cardiologist-labeled validation set, confusion matrix, sensitivity/specificity measurement, prospective validation, or FDA/CE-style software lifecycle evidence. Therefore the platform must be labeled internally and externally as physician-review clinical decision support only, not autonomous ECG diagnosis.

## Pipeline Classification

### Primary AI Analysis

Files audited:

- `server/src/ai/providers.ts`
- `server/src/ai/engine.ts`
- `server/src/ai/ai.service.ts`
- `server/src/ai/ai.routes.ts`
- `server/src/ai/domain.ts`

Classification: rule-based by default, optionally hybrid.

Evidence:

- `RuleBasedProvider` calls `analyzeECG()`.
- `MockProvider` calls the same engine without measurements and forces high confidence.
- `DeepLearningProvider` calls an external endpoint only if `AI_MODEL_ENDPOINT` is configured; otherwise it falls back to `RuleBasedProvider`.
- The engine uses interval and text-context thresholds for diagnosis rather than trained waveform inference.

Clinical status:

- Suitable for workflow prototyping and physician-supervised decision support demos.
- Not suitable for safety-critical diagnostic claims.
- Not suitable for sensitivity/specificity claims without external labeled validation.

### Image Analysis Pipeline

Files audited:

- `server/src/modules/ecg-processing/ecg-image-analysis.service.ts`
- `server/src/modules/ecg-processing/ecg-processing.routes.ts`
- `server/src/modules/ecg-processing/ecg-digitization.service.ts`
- `server/src/modules/ecg-files/ecg-clinical.service.ts`
- `server/src/ai/preprocessing.pipeline.ts`

Classification: deterministic/simulated image preprocessing plus rule-based interpretation.

Evidence:

- Border detection, crop, deskew, rotation, contrast, shadow removal, grid detection, and lead coordinates are inferred deterministically from file metadata, file size, filename, and fixed 12-lead coordinate layout.
- Digitized waveform reconstruction generates synthetic ECG-like samples for image files.
- Feature extraction is based on simple peak detection and heuristics.
- The prior implementation report explicitly notes the pipeline avoids native image-processing dependencies and creates stable artifacts that can later be backed by OpenCV, Sharp, or a deep-learning provider.

Clinical status:

- Useful for UI, workflow, and data model integration.
- Not clinically valid for interpreting scanned ECGs.
- Must not be described as validated ECG image AI.

### Waveform Processing Pipeline

Files audited:

- `server/src/modules/ecg-processing/ecg-processing.service.ts`
- `server/src/modules/ecg-files/ecg-clinical.service.ts`

Classification: deterministic signal processing plus rule-based features.

Evidence:

- Supports `.csv`, `.txt`, and `.json` numeric waveform files.
- Performs normalization, baseline removal by moving average, smoothing, R-peak detection, simple interval derivation, ST sampling, and quality grading.
- Does not use a validated QRS detector, morphology classifier, lead-specific ischemia rules, rhythm strip analysis, or trained arrhythmia model.

Clinical status:

- Better clinical footing than the image simulator because it operates on numeric samples.
- Still not validated and not adequate for regulated diagnostic claims.

### Explainability Engine

Files audited:

- `server/src/ai/explainability.ts`
- `server/src/modules/ecg-processing/ecg-image-analysis.service.ts`
- `server/src/modules/ecg-processing/ecg-digitization.service.ts`

Classification: rule-based visualization/explanation.

Evidence:

- Affected leads are mapped from diagnosis labels.
- Heatmap intensity is derived from severity, not from model attribution.
- Annotations are generated from diagnosis labels and synthetic or heuristic indices.

Clinical status:

- Useful as physician-facing rationale scaffolding.
- Not true model explainability or saliency.

## Supported Diagnosis Inventory

The formal diagnosis catalog in `server/src/ai/domain.ts` includes 20 labels:

- Normal ECG
- Normal Sinus Rhythm
- Sinus Bradycardia
- Sinus Tachycardia
- Atrial Fibrillation
- Atrial Flutter
- PVC
- PAC
- First Degree AV Block
- Second Degree AV Block
- Third Degree AV Block
- RBBB
- LBBB
- STEMI
- NSTEMI
- LVH
- RVH
- Hyperkalemia
- Long QT
- WPW

The image analysis pipeline additionally returns shorter labels such as `AF`, `RBBB`, `LBBB`, `STEMI`, `NSTEMI`, `Sinus Bradycardia`, `Sinus Tachycardia`, `QT prolongation`, and `Normal ECG`, with LVH/RVH and atrial flutter mostly represented as differential labels rather than primary robust detections.

## Diagnostic Coverage Against Required Conditions

### Normal Sinus Rhythm

Current support: partial.

The catalog supports `Normal Sinus Rhythm` and `Normal ECG`, but the default rule engine often emits `Normal ECG` unless case text explicitly indicates normal sinus rhythm. Validation must separate normal ECG from normal sinus rhythm with P-wave criteria, axis, intervals, and rate.

Expected validation target:

- Sensitivity: at least 95% for high-quality 12-lead ECGs.
- Specificity: at least 95% against AF/flutter, paced rhythm, AV block, and ectopy.

### Atrial Fibrillation

Current support: partial.

The rule engine can infer atrial fibrillation from low rhythm regularity or case text. The image pipeline can emit `AF` based on rhythm regularity. It does not validate absent P waves lead-by-lead, flutter mimic exclusion, or noisy baseline false positives.

Expected validation target:

- Sensitivity: at least 94% on rhythm strips of adequate length.
- Specificity: at least 95% against PACs, sinus arrhythmia, artifact, and atrial flutter.

### Atrial Flutter

Current support: weak/mostly text-driven.

The catalog includes atrial flutter and the engine can infer it from case text. There is no robust sawtooth morphology detector or atrial-rate logic.

Expected validation target:

- Sensitivity: at least 90%.
- Specificity: at least 95% against AF, SVT, sinus tachycardia, and artifact.

### PVC

Current support: weak/text-driven.

PVC is in the catalog and can be inferred from case text. There is no robust beat-by-beat ectopy classifier, compensatory pause logic, morphology width validation, or burden quantification.

Expected validation target:

- Sensitivity: at least 90% for frequent PVCs and at least 85% for isolated PVCs.
- Specificity: at least 95% against PAC with aberrancy, bundle branch block, paced beats, and noise.

### PAC

Current support: weak/text-driven.

PAC is in the catalog and can be inferred from case text. There is no premature atrial beat detector, P-wave morphology comparison, or pause analysis.

Expected validation target:

- Sensitivity: at least 85%.
- Specificity: at least 95% against PVC, sinus arrhythmia, and artifact.

### AV Blocks

Current support: partial.

First, second, and third degree AV block are in the catalog. Rule thresholds use PR interval, rhythm regularity, and bradycardia. There is no explicit Mobitz I vs Mobitz II classification, dropped beat detection, AV dissociation validation, junctional escape logic, or pacing distinction.

Expected validation target:

- First-degree AV block sensitivity/specificity: at least 95%/95%.
- Second-degree AV block sensitivity/specificity: at least 90%/97%.
- Third-degree AV block sensitivity/specificity: at least 95%/99% because missed complete heart block is high risk.

### Bundle Branch Blocks

Current support: partial.

RBBB and LBBB are in the catalog and can be triggered by QRS duration. The engine does not validate morphology criteria such as rsR' in V1, broad terminal S in I/V6, broad notched R in lateral leads, or discordant ST-T changes.

Expected validation target:

- RBBB sensitivity/specificity: at least 95%/95%.
- LBBB sensitivity/specificity: at least 95%/97%.

### LVH

Current support: weak/text/differential.

LVH is in the catalog and appears in differential logic. There is no Sokolow-Lyon, Cornell voltage, strain pattern scoring, age/sex normalization, or lead calibration confidence validation.

Expected validation target:

- Sensitivity: 70-85% depending on criteria and population.
- Specificity: at least 90%.

### RVH

Current support: weak/text/differential.

RVH is in the catalog and appears in axis-based differential logic. There is no validated RVH criteria set, R/S progression analysis, or pulmonary disease context integration.

Expected validation target:

- Sensitivity: 60-80% depending on criteria.
- Specificity: at least 90%.

### STEMI

Current support: partial but unsafe without validation.

STEMI is in the catalog and can be triggered by ST deviation or case text. The current rules lack age/sex-specific J-point thresholds, contiguous lead grouping, reciprocal change logic, posterior/right-sided MI support, LBBB/paced rhythm STEMI equivalents, early repolarization differentiation, pericarditis differentiation, and serial change handling.

Expected validation target:

- Sensitivity: at least 95% for clear STEMI.
- Specificity: at least 95% against early repolarization, pericarditis, LVH strain, LBBB, paced rhythm, Brugada, hyperkalemia, and artifact.
- Critical miss target: zero known P0 missed STEMI cases in locked validation before release.

### NSTEMI

Current support: weak and clinically incomplete.

NSTEMI is inferred from ST depression or case text, but NSTEMI cannot be diagnosed by ECG alone. It requires symptoms, troponin, serial ECG, and clinical risk context. Current labeling risks overclaiming.

Expected validation target:

- ECG ischemia sensitivity: at least 80% for ST depression/T-wave ischemic patterns.
- Specificity: at least 90% against LVH strain, digoxin effect, hypokalemia, rate-related ST depression, and artifact.
- Product wording should be `ischemic ST-T changes / possible ACS`, not autonomous NSTEMI diagnosis.

### Pericarditis

Current support: missing as primary diagnosis.

Pericarditis appears only as a differential for ST elevation in image interpretation. There is no primary pericarditis diagnosis, diffuse concave ST elevation logic, PR depression logic, reciprocal lead exclusion, or staged ECG evolution.

Expected validation target:

- Sensitivity: at least 85%.
- Specificity: at least 95% against STEMI and early repolarization.

### Hyperkalemia

Current support: weak/text-driven.

Hyperkalemia is in the catalog, but primarily inferred from case text. There is no quantitative peaked T-wave detection, QRS widening progression, PR prolongation, P-wave flattening, sine-wave pattern detection, or potassium correlation workflow.

Expected validation target:

- Sensitivity: at least 85% for moderate/severe hyperkalemia ECG patterns.
- Specificity: at least 95% against early repolarization, tall T-wave normal variant, STEMI, LVH strain, and artifact.

### QT Prolongation

Current support: partial.

Long QT is in the catalog and triggered by QTc thresholds. The image pipeline can emit `QT prolongation`. Validation is limited by heuristic QT and RR estimation.

Expected validation target:

- Sensitivity: at least 95% for QTc >= 500 ms.
- Specificity: at least 95% for QTc < 470 ms.
- Borderline QTc handling should be stratified by sex, heart rate, rhythm, and correction formula.

## Missing or Incomplete Diagnoses

High-priority missing diagnoses:

- Ventricular tachycardia as a formal primary diagnosis.
- SVT subtypes.
- Ventricular fibrillation.
- Asystole.
- Complete paced rhythm interpretation.
- Pacemaker failure to capture/sense.
- Brugada pattern.
- WPW risk stratification beyond text-driven label.
- Early repolarization.
- Acute posterior MI.
- Right ventricular MI.
- De Winter pattern.
- Wellens syndrome.
- Left anterior fascicular block.
- Left posterior fascicular block.
- Bifascicular and trifascicular block.
- Mobitz I vs Mobitz II.
- Junctional rhythm.
- Escape rhythms.
- Low voltage.
- Electrical alternans.
- Pulmonary embolism strain pattern.
- Hypokalemia.
- Hypocalcemia and hypercalcemia.
- Digitalis effect.
- Lead reversal and electrode misplacement.
- Artifact/noise diagnosis as a blocking result.

## Dangerous False Negative Scenarios

P0 unsafe if released without mitigation:

- Missed STEMI due to relying on a single global ST-deviation value instead of contiguous lead-specific criteria.
- Missed STEMI equivalent in LBBB or paced rhythm.
- Missed posterior MI because posterior leads and reciprocal anterior ST depression logic are absent.
- Missed complete heart block when PR/rhythm heuristics do not capture AV dissociation.
- Missed ventricular tachycardia because VT is only represented indirectly as an alert/rate condition and not a formal diagnosis.
- Missed hyperkalemia when case text does not mention it.
- Missed AF/flutter in short or noisy tracings because rhythm duration and P-wave validation are limited.
- Missed QT prolongation when synthetic/image-derived QT estimation is inaccurate.

P1 inaccurate:

- NSTEMI label generated from ECG features alone without troponin/clinical context.
- Atrial flutter misclassified as sinus tachycardia or AF.
- PVC/PAC not reliably distinguished because beat morphology and compensatory pause logic are absent.
- LBBB/RBBB diagnosed from QRS duration without morphology validation.
- LVH/RVH mostly text/differential-driven rather than voltage criteria-driven.

## Dangerous False Positive Scenarios

P0 unsafe:

- False STEMI activation from early repolarization, pericarditis, LVH strain, Brugada, hyperkalemia, LBBB, paced rhythm, or artifact.
- False complete heart block in severe sinus bradycardia or artifact.
- False hyperkalemia warning without T-wave/QRS/P-wave criteria.

P1 inaccurate:

- False AF from PACs, sinus arrhythmia, baseline wander, tremor, or poor electrode contact.
- False NSTEMI from LVH strain, digoxin effect, rate-related ST depression, or hypokalemia.
- False Long QT from incorrect T-wave endpoint or high heart rate correction error.
- False bundle branch block from noise, pacing, or ventricular ectopy.

## Clinical Safety Matrix

P0 unsafe findings:

- No validated sensitivity/specificity evidence exists for any diagnosis.
- Image analysis and digitization can synthesize ECG-like waveforms, so image-derived diagnoses may appear clinically precise without true signal evidence.
- STEMI, complete heart block, VT-equivalent alerts, hyperkalemia, and QT prolongation can affect urgent care decisions but are not locked behind validated clinical performance gates.
- `MockProvider` can force 99% confidence and must be blocked in production.

P1 inaccurate findings:

- Diagnosis rules are threshold/text based and do not implement full clinical ECG criteria for many diagnoses.
- NSTEMI is over-labeled from ECG alone.
- Bundle branch blocks use QRS duration without morphology.
- AF/flutter/PAC/PVC logic is insufficient for rhythm and ectopy differentiation.
- Explainability heatmaps are severity/label driven, not model-attribution driven.

P2 incomplete findings:

- No labeled validation corpus.
- No cardiologist adjudication workflow for validation datasets.
- No confusion matrices or performance reports.
- No per-diagnosis validation harness.
- No external dataset ingestion pipeline.
- No lead reversal/artifact/noise rejection framework.
- No demographic stratification for ECG thresholds.
- No locked test-set governance.

P3 enhancements:

- Add dataset dashboards, clinical QA workbench, and reviewer disagreement analytics.
- Add calibration curves, confidence reliability plots, and decision-threshold tuning.
- Add post-market monitoring and drift analytics.
- Add model cards, intended-use labeling, and release notes for clinical performance.

## Validation Framework To Build

### Dataset Architecture

Create a versioned ECG validation repository with:

- Raw waveform files, scanned ECG images, and source metadata.
- Expert labels from at least two independent cardiologists.
- Adjudicated final labels for disagreements.
- Label granularity at patient, ECG, rhythm strip, lead, beat, and measurement levels.
- Demographics: age, sex, comorbidities, medication context, and acquisition device.
- Signal quality and artifact labels.
- Explicit exclusions and uncertainty labels.

Required datasets:

- Normal sinus rhythm controls.
- AF and flutter rhythm sets.
- Ectopy sets for PAC/PVC frequency and morphology.
- AV block sets including first degree, Mobitz I, Mobitz II, high-grade AV block, and complete heart block.
- BBB sets with RBBB, LBBB, incomplete BBB, paced rhythm, and nonspecific IVCD.
- Hypertrophy sets with LVH/RVH and normal voltage controls.
- Ischemia sets with STEMI, posterior MI, right-sided MI, NSTEMI/ischemic ST depression, early repolarization, pericarditis, LVH strain, and LBBB confounders.
- Electrolyte sets with hyperkalemia, hypokalemia, QT prolongation, and QT-normal controls.

### Minimum Sample Targets

For an internal locked validation milestone:

- At least 500 normal sinus rhythm ECGs.
- At least 300 AF ECGs and 200 atrial flutter ECGs.
- At least 300 PVC/PAC ECGs with beat-level labels.
- At least 100 cases for each AV block subtype.
- At least 200 RBBB and 200 LBBB ECGs.
- At least 300 LVH/RVH ECGs combined.
- At least 300 STEMI ECGs with territory labels and 500 STEMI mimics.
- At least 300 ischemic ST-depression/NSTEMI-context ECGs with troponin linkage.
- At least 150 pericarditis ECGs and 300 mimics.
- At least 150 hyperkalemia ECGs with potassium values.
- At least 300 QT prolongation ECGs with manually measured QT/QTc.

For FDA/CE-facing pivotal validation, sample sizes must be statistically justified by intended use, prevalence, confidence intervals, subgroup requirements, and clinical risk class.

### Metrics

Required per diagnosis:

- Sensitivity.
- Specificity.
- Positive predictive value.
- Negative predictive value.
- AUROC or AUPRC where probabilistic output is available.
- Confusion matrix.
- False positive and false negative review.
- Confidence calibration.
- Performance by signal quality.
- Performance by age, sex, device, acquisition source, and inpatient/outpatient setting.
- Time-to-result and failure-to-analyze rate.

Required measurement metrics:

- Heart rate mean absolute error.
- PR interval mean absolute error.
- QRS duration mean absolute error.
- QT/QTc mean absolute error.
- ST deviation error by lead and territory.
- Axis classification accuracy.

Suggested acceptance thresholds:

- Heart rate error: <= 5 bpm for high-quality digital ECG.
- PR/QRS/QT interval error: <= 10-20 ms depending on measurement.
- QTc error: <= 25 ms with manual adjudication.
- STEMI false negative rate: near zero in pivotal high-quality test set.

### Test Harness Design

Build a `clinical-validation` test layer separate from unit tests:

- Dataset manifest: ECG file path, acquisition metadata, ground-truth diagnoses, measurement labels, adjudication status.
- Runner: invokes ingestion, preprocessing, measurement extraction, AI diagnosis, and explainability generation.
- Evaluator: compares predictions to ground truth by diagnosis and measurement.
- Reporter: emits JSON, CSV, and Markdown summaries with confusion matrices and safety findings.
- Gatekeeper: fails release if P0 diagnoses regress or minimum performance is not met.
- Audit trail: records model version, code commit, dataset version, config, thresholds, and reviewer sign-off.

### Release Gates

Gate 1: non-clinical engineering validation.

- All unit, integration, smoke, and QA tests pass.
- Mock provider disabled in production.
- UI displays physician-review disclaimer.
- Poor signal/image quality blocks diagnosis instead of producing confident output.

Gate 2: retrospective clinical validation.

- Locked validation dataset.
- Cardiologist-adjudicated labels.
- Per-diagnosis sensitivity/specificity reports.
- Safety review of every false negative for P0 conditions.

Gate 3: prospective silent-mode validation.

- Run in parallel with physician interpretation.
- No autonomous clinical action.
- Collect discordance and override data.

Gate 4: regulated release package.

- IEC 62304 software lifecycle evidence.
- ISO 14971 risk management file.
- IEC 62366 usability validation.
- Cybersecurity and privacy evidence.
- Clinical evaluation report.
- Post-market surveillance plan.

## Roadmap Toward FDA/CE Style Validation

Phase 0: safety labeling and controls.

- Mark current engine as `rule-based investigational clinical decision support`.
- Block `mock` provider in production.
- Display diagnosis confidence as non-calibrated until validated.
- Require physician review before report finalization.
- Add hard quality gates for poor image/waveform inputs.

Phase 1: validation infrastructure.

- Implement dataset manifest and clinical validation runner.
- Add gold-standard labels and adjudication workflow.
- Add per-diagnosis confusion matrices and safety review output.
- Add measurement-error validation.

Phase 2: clinically complete rules.

- Implement full criteria for STEMI territories and mimics.
- Implement rhythm classifier for AF/flutter/PAC/PVC/VT/SVT.
- Implement AV block subtype logic.
- Implement lead-specific BBB, LVH, RVH, QT, electrolyte, and artifact rules.
- Add lead reversal and electrode misplacement detection.

Phase 3: model development.

- Train or integrate validated ECG waveform models.
- Separate image digitization model from diagnostic model.
- Validate image-to-waveform digitization against manually digitized traces.
- Calibrate confidence scores.

Phase 4: clinical validation.

- Conduct retrospective multi-site validation.
- Conduct prospective silent-mode validation.
- Run subgroup analysis.
- Lock thresholds before final validation.

Phase 5: regulatory readiness.

- Define intended use, indications, contraindications, user population, and clinical environment.
- Prepare clinical evaluation report.
- Prepare software bill of materials and cybersecurity file.
- Prepare risk management and usability files.
- Establish post-market performance monitoring and complaint handling.

## Remediation Backlog

P0:

- Block or clearly label all non-validated urgent diagnoses before production clinical use.
- Disable `MockProvider` in production.
- Prevent image-derived synthetic waveform outputs from being presented as real extracted ECG evidence.
- Require clinician confirmation before any critical alert is escalated as a diagnosis.

P1:

- Replace text-driven diagnosis inference with explicit ECG criteria.
- Reword NSTEMI as possible ischemic ST-T abnormality unless troponin/clinical context supports ACS.
- Add lead-specific STEMI and mimic logic.
- Add rhythm/ectopy detection beyond simple rhythm regularity.

P2:

- Build clinical validation harness and labeled dataset pipeline.
- Add confusion matrix reports and measurement-error reports.
- Add poor-quality/noise/artifact diagnosis gating.
- Add subgroup and device stratification.

P3:

- Add validation dashboards and trend monitoring.
- Add model cards and versioned clinical release notes.
- Add cardiologist disagreement analytics.

## Final Classification

Current ECG Insight analysis engine:

- Real AI: not demonstrated in default or validated configuration.
- Rule-based: yes, this is the main diagnostic engine.
- Mock data: yes, available through `MockProvider` and synthetic image/waveform reconstruction paths.
- Hybrid: partially, because an external deep-learning endpoint can be configured, but the implementation still merges/falls back to rule-based results and no model validation evidence is present.

Clinical readiness:

- Engineering prototype: strong.
- Clinical decision support prototype: partial.
- Autonomous diagnostic system: not ready.
- FDA/CE regulated diagnostic claim: not ready.
