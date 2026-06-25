# ECG Insight Clinical Analysis Workflow Report

## Scope

Implemented the end-to-end ECG clinical workflow while preserving existing UI shell, authentication, dashboard, routing, and AI provider architecture.

## Smart ECG Upload

- Enhanced `/upload-ecg` with multi-file selection and preview.
- Supports accepted workflow formats:
  - `jpg`
  - `jpeg`
  - `png`
  - `pdf`
- Preserved mobile camera capture through Expo Image Picker.
- Added web image/PDF multi-select support through a guarded browser file picker.
- Added source metadata for upload, camera capture, and drag/drop-style web selection.
- Added image thumbnail and PDF preview cards with remove actions.

## Preprocessing Workflow

- Added visible preprocessing progress states for:
  - Auto crop
  - Border detection
  - Deskew
  - Perspective correction
  - Contrast enhancement
  - Shadow removal
  - ECG grid cleanup
- Upload flow now stages case creation, upload, preprocessing, analysis, and report generation.

## Analysis Workflow

- After upload, the workflow creates a patient, creates an ECG case, uploads all selected ECG files, queues AI analysis, polls for the completed analysis, and generates an enterprise report.
- AI result display includes:
  - Primary diagnosis
  - Confidence
  - Severity band
  - Heart rate
  - Clinical interpretation
  - Report number when generated

## Explainability Panel

- Enhanced `/ecg-analysis` with an AI Explainability panel.
- Displays:
  - Abnormal leads
  - Detected abnormalities
  - Confidence
  - Severity
  - Heart rate
  - Signal quality
  - Interpretation rationale

## Doctor Review Workflow

- Added doctor review states and actions in `/ecg-analysis`.
- Workflow states:
  - Draft
  - AI Analyzed
  - Under Review
  - Approved
  - Finalized
- Doctor actions:
  - Edit diagnosis
  - Add comments / interpretation
  - Save review
  - Approve
  - Reject
  - Finalize report

## Report Generation

- The upload workflow generates an enterprise report after AI analysis.
- The review workflow can generate/finalize reports using existing report APIs.
- Existing signed report and PDF generation backend behavior remains preserved.

## Persistence

The workflow persists through existing backend relationships:

- Organization
- Patient
- ECG Case
- ECG Files
- AI Results
- Doctor Review metadata
- Clinical Report
- Timeline events and audit logs

## Validation

- `npm run build` passed.
- `npm run lint` passed.
- `npm run test` passed.
- Focused TypeScript passed for edited frontend workflow files.
- Focused ESLint passed for edited frontend workflow files.
- IDE diagnostics reported no linter errors for edited files.

## Route Validation

Expo web route probes:

- `/upload-ecg` returned `200 text/html`
- `/ecg-analysis` returned `200 text/html`
- `/patients` returned `200 text/html`
- `/reports` returned `200 text/html`

The first `/upload-ecg` probe timed out during initial web compilation, then passed immediately on retry after the dev server warmed up.

## Known Limitations

- Native PDF picking is represented through the web file picker because `expo-document-picker` is not installed in the project. Mobile camera capture and image library selection remain supported.
- Pixel-level preprocessing is represented as workflow progress and backend preprocessing metadata; the backend is prepared for future OpenCV/native image processing integration.
