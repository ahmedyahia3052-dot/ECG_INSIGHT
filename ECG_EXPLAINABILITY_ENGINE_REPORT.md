# ECG Explainability Engine Report

## Architecture

Implemented the ECG Explainability Engine inside the existing enterprise ECG workstation component:

- `artifacts/ecg-insight/components/ecg/EcgProViewer.tsx`

The engine builds on the existing ECG Pro Viewer and adds a clinical annotation layer, explainability side panel, measurement panel, lead navigation, confidence visuals, critical alert expansion, comparison summary, and Medical AI Copilot handoff.

## Components

- Transparent ECG annotation layer over the uploaded ECG image.
- Heatmap overlay using AI explainability heatmap points.
- Lead-aware annotation boxes and clinical labels.
- AI finding evidence panel: diagnosis, evidence, confidence, and measurements.
- Measurement panel for HR, PR, QRS, QT, QTc, axis, P duration, and ST deviation.
- Interactive lead navigator for I, II, III, aVR, aVL, aVF, V1-V6.
- Lead focus workspace with filtered annotations and enlarged waveform.
- Clinical calipers for PR, QRS, QT, QTc, and RR interval adjustment.
- ECG grid overlay with show/hide, 25/50 mm/sec, clinical red/gray mode, and opacity controls.
- Critical ECG alert banner for STEMI, VT, VF, Complete Heart Block, Hyperkalemia, Torsades, Asystole, and Long QT patterns.
- Comparison summary for ST changes, heart rate changes, QTc trend, and new arrhythmia review.
- Confidence visualization with green/yellow/red coding.

## Workflow

1. Physician opens `/ecg-cases/:id`.
2. The ECG Pro Viewer renders the original ECG image or PDF.
3. The Explainability Engine maps AI findings and lead highlights into visual annotations.
4. The physician can filter annotations by lead, open lead focus mode, inspect measurements, and use calipers.
5. The side panel explains why the AI produced the diagnosis.
6. Clicking `Explain this finding` opens the Medical AI Copilot and sends the selected finding with evidence.
7. Patient profile timeline now shows ECG progression across years and diagnoses.

## Clinical Examples

Example: Atrial Fibrillation

- Lead II annotation: absent P waves.
- Evidence panel: irregular RR intervals, no organized P waves, fibrillatory baseline.
- Confidence visualization: color-coded confidence percentage.

Example: Inferior STEMI

- Leads II, III, aVF annotation: ST elevation.
- Critical banner: immediate physician review required.
- Comparison panel prompts review for new ST elevation and reciprocal changes.

Example: RBBB

- Lead V1 annotation: RBBB morphology.
- Measurement panel highlights QRS duration.
- Lead focus filters annotations to V1.

## Patient Timeline Integration

The Patient Profile timeline tab now includes an ECG Timeline showing case year, case ID, diagnosis, and critical severity markers.

## Medical AI Copilot Integration

The Explainability Engine dispatches a `medical-copilot:ask` event when the physician clicks `Explain this finding`.

The Medical AI Copilot listens for this event, opens automatically, and sends the finding prompt through the existing Clinical RAG pipeline.

## Validation Evidence

Passed:

- `npm run build`
- `npm run lint`
- `npm run test`
- IDE diagnostics on edited files

Frontend smoke validation:

- `npx expo start --web --port 8085`
- Metro bundled successfully.
- Local HTTP probe returned `HTTP 200`.
- No startup runtime errors.
- No circular dependency warnings.

Known note:

- Expo reported package compatibility suggestions for `@types/react` and `@types/react-dom`; these are pre-existing version alignment warnings and not related to the explainability engine.
