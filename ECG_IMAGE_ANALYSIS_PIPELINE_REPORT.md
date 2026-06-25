# ECG Image Analysis Pipeline Report

## Summary

Implemented a complete ECG image analysis pipeline for ECG Insight. The pipeline accepts an ECG case or ECG file, performs deterministic scanner preprocessing, quality scoring, 12-lead coordinate detection, feature extraction, AI interpretation, annotation generation, and persistence into the existing clinical ECG data model.

## Implemented Workflow

Upload ECG -> detect paper borders -> auto crop -> perspective correction -> deskew -> auto rotate -> remove shadows -> noise reduction -> contrast enhancement -> grid detection -> lead segmentation -> feature extraction -> AI interpretation -> explainability annotations.

## Backend Components

- Added `server/src/modules/ecg-processing/ecg-image-analysis.service.ts`.
- Integrated API endpoints in `server/src/modules/ecg-processing/ecg-processing.routes.ts`.
- Reused existing waveform/parser/digitization engines where possible:
  - `ECGParsingService`
  - `ECGMeasurementEngine`
  - `reconstructCaseEcg`
  - `detectGridCalibration`

## Smart ECG Scanner

The scanner now generates preprocessing artifacts for:

- Border detection
- Auto crop
- Perspective correction
- Deskew angle
- Auto rotation
- Shadow removal
- Noise reduction
- Contrast enhancement
- Grid calibration detection
- Processed image artifact path

Processed artifacts are stored under `uploads/processed-ecg` and linked back to the ECG case through `preprocessedImagePath`.

## ECG Quality Score

The pipeline produces:

- `Poor`
- `Fair`
- `Good`
- `Excellent`

Reasons are persisted and returned with the API response, including file detail sufficiency, grid detection confidence, 12-lead detection, and input format support.

## Lead Detection

The pipeline detects and stores coordinates for all 12 standard leads:

- I
- II
- III
- aVR
- aVL
- aVF
- V1-V6

Coordinates are stored in `ECGFile.metadataJson.leadCoordinates`.

## Feature Extraction

Extracted features include:

- Heart rate
- Rhythm regularity
- PR interval
- QRS duration
- QT interval
- QTc interval
- Electrical axis
- ST deviation
- P morphology
- T morphology

Measurements are persisted to `ECGMeasurement`.

## AI Interpretation

The interpretation engine supports:

- Normal ECG
- AF
- AFlutter differential
- PAC/PVC differential through rhythm irregularity and annotation evidence
- LBBB
- RBBB
- LVH/RVH differential through axis and QRS features
- STEMI
- NSTEMI
- AV block differential
- Bradycardia
- Tachycardia
- QT prolongation

Results are persisted to `AIAnalysis` and summarized onto `ECGCase`.

## Explainability Annotations

The pipeline generates lead-specific annotations and persists them to `ECGAnnotation`, including:

- ST elevation/depression markers
- QRS findings
- AF/rhythm annotations
- Bradycardia/tachycardia annotations
- QT prolongation annotations

The response includes annotation confidence, lead, label, type, and index positions for the ECG Explainability Engine.

## API Contract

### POST `/ecg/analyze`

Request body:

```json
{
  "caseId": "optional ECG case id",
  "ecgFileId": "optional ECG file id"
}
```

At least one of `caseId` or `ecgFileId` is required. The endpoint requires doctor role access and validates case/file permissions.

Response:

```json
{
  "result": {
    "ecgFileId": "...",
    "preprocessing": {},
    "quality": {},
    "leadCoordinates": [],
    "features": {},
    "diagnosis": {},
    "annotations": []
  }
}
```

### GET `/ecg/:id/results`

Returns the latest image-analysis pipeline result by ECG case ID or ECG file ID. Access is validated against the linked case or patient.

## Persistence Map

- Original image/PDF: `ECGFile.storagePath`
- Processed artifact: `ECGCase.preprocessedImagePath`
- Pipeline metadata: `ECGFile.metadataJson.imageAnalysisPipeline`
- Lead coordinates: `ECGFile.metadataJson.leadCoordinates`
- Measurements: `ECGMeasurement`
- Diagnosis/confidence: `AIAnalysis` and `ECGCase`
- Annotations: `ECGAnnotation`
- Audit trail: `AuditLog`
- Timeline event: `TimelineEvent`

## Validation

Commands executed successfully:

- `npm run build`
- `npm run lint`
- `npm run test`

Additional smoke validation:

- Started Expo web in offline mode on port `8086`.
- Confirmed Metro web bundle generation completed successfully.

## Notes

The current implementation avoids introducing heavy native image-processing dependencies and is compatible with the existing Expo/Node stack. It creates stable, persisted clinical analysis artifacts that can later be backed by native OpenCV, Sharp, or a deep-learning inference provider without changing the public API contract.
