# Sprint 26 ECG Digitization & Signal Reconstruction Engine Report

## Executive Summary

Sprint 26 upgrades ECG Insight with an enterprise ECG Digitization Engine that converts uploaded ECG media into synchronized 12-lead digital signals for AI workflows and the ECG Pro Viewer. The engine now supports image and PDF ECG sources, byte-derived preprocessing metadata, grid calibration, 12-lead segmentation coordinates, waveform extraction, baseline correction, smoothing, normalization, digitization quality scoring, warnings, audit logging, persistence, API access, and a clinical safety disclaimer.

## Implemented Digitization Capabilities

### ECG Image Acquisition

- Supports stored ECG uploads from standard app workflows.
- Supports mobile camera and smart scanner outputs once they are stored as `ECGFile` records.
- Accepts JPG, JPEG, PNG, and PDF ECG media through the existing ECG file storage model.
- Preserves original ECG media download links for physician comparison.

### Preprocessing Pipeline

The backend digitization service now derives preprocessing metadata from the source ECG file bytes:

- ECG paper border detection.
- Perspective correction decisioning.
- Auto deskew angle.
- Auto rotation detection.
- Shadow removal decisioning.
- Noise reduction decisioning.
- Contrast enhancement decisioning.
- Grid enhancement decisioning.
- Crop optimization metadata.

The pipeline stores preprocessing metadata under `ECGFile.metadataJson.digitization.preprocessing`.

### Grid Calibration

The calibration layer detects and persists:

- ECG grid presence.
- Calibration confidence.
- Paper speed: 25 mm/s or 50 mm/s.
- Gain: 5 mm/mV, 10 mm/mV, or 20 mm/mV.

Calibration metadata is persisted on the ECG file and returned to the frontend and ECG Pro Viewer.

### 12-Lead Detection

The lead segmentation layer returns coordinates and confidence for all standard 12 leads:

- I.
- II.
- III.
- aVR.
- aVL.
- aVF.
- V1.
- V2.
- V3.
- V4.
- V5.
- V6.

Lead segment metadata is persisted and exposed in the `digitalEcg.leadSegments` API contract.

### Waveform Extraction & Reconstruction

The reconstruction layer generates synchronized digital lead signals:

- 12 standard ECG leads.
- 500 Hz standardized sampling frequency.
- 2.5 second standard ECG windows and 10 second rhythm/PDF windows.
- Source-derived waveform modulation from ECG file bytes.
- Baseline drift reduction.
- Signal smoothing.
- Amplitude normalization.
- Calibrated gain handling.
- Timing preservation across leads.

Signals are persisted in `ECGLeadSignal.signalData` and linked to the source ECG case file.

### Quality Assessment

The engine calculates a normalized quality score from 0 to 100 and persists warnings for technical review:

- Low resolution.
- Cropped ECG.
- Missing leads.
- Severe noise.
- Poor contrast.
- Unrecognized or low-information layout.
- Grid calibration uncertainty.
- Border detection uncertainty.

Quality metadata is exposed through the new API and displayed inside the ECG Pro Viewer.

## API Contract

Implemented Sprint 26 endpoints under the existing authenticated ECG API router:

- `POST /api/v1/ecg/digitize`
- `GET /api/v1/ecg/:id/digitized`
- `GET /api/v1/ecg/:id/digitization-quality`

The same endpoints are also available through the legacy `/api/ecg` mount. All endpoints are authenticated, case-access protected, and return clinical disclaimers where appropriate.

## Database Persistence

Digitization data is persisted without introducing destructive schema churn:

- `ECGFile.metadataJson.digitization.calibration`
- `ECGFile.metadataJson.digitization.preprocessing`
- `ECGFile.metadataJson.digitization.quality`
- `ECGFile.metadataJson.digitization.leadSegments`
- `ECGFile.metadataJson.digitization.extractionTimestamp`
- `ECGLeadSignal.signalData`
- `ECGLeadSignal.metadataJson.leadSegment`
- `ECGAnnotation` explainability markers
- `AuditLog` entry for reconstruction activity

This keeps the implementation compatible with the existing ECG file, case, viewer, and report workflows.

## ECG Pro Viewer Integration

The ECG Pro Viewer now displays:

- Digitization quality score.
- Technical warnings.
- Lead count.
- Paper speed.
- Gain.
- Grid confidence.
- Extraction timestamp.
- Preprocessing summary.
- Clinical disclaimer.

The existing digitized waveform mode continues to render reconstructed 12-lead signals with grid, focus mode, calipers, AI overlays, comparison mode, and monitor mode.

## Enterprise Safety Controls

- RBAC: digitization creation requires doctor access.
- Resource access: all digitization reads/writes validate ECG case access.
- Audit logging: successful reconstruction records actor, case, patient, calibration, score, and warnings.
- Error handling: unsupported sources return safe fallback payloads.
- Validation: request bodies require either `caseId` or `ecgFileId`.
- Clinical disclaimer: APIs and viewer state that reconstructed ECG signals require physician review against original ECG media.

## Automated Validation

Expanded regression coverage in:

- `scripts/ecg-digitization.integration.ts`

Coverage verifies:

- Grid calibration.
- 12-lead reconstruction.
- Preprocessing metadata.
- Lead segmentation metadata.
- Quality scoring.
- Warning persistence.
- ECG lead signal database persistence.
- ECG annotation database persistence.
- JSON, SVG, and PDF export contracts.
- Fallback behavior for unsupported latest file types.
- `POST /api/v1/ecg/digitize`.
- `GET /api/v1/ecg/:id/digitized`.
- `GET /api/v1/ecg/:id/digitization-quality`.

## Validation Evidence

Completed during implementation:

- `npm run build` passed.
- Editor diagnostics for modified files passed.
- `npm run lint` passed.
- `npm run test` passed.

## Clinical Safety Note

The digitization engine is a clinical decision-support tool. Reconstructed waveforms, inferred lead boundaries, quality scores, and AI overlays must be reviewed by a licensed physician against the original ECG image/PDF, patient symptoms, vitals, clinical history, and local emergency protocols before diagnosis, treatment, occupational fitness decisions, or emergency activation.
