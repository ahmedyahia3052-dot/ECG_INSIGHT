# Real AI Integration Report

## Executive Summary

ECG Insight now has a production application integration path for a trained ONNX ECG model. The
backend automatically detects `model.onnx`, runs inference with ONNX Runtime when a trained model is
available, and falls back to the existing rule-based clinical engine when no model or digitized ECG
signal is available.

The integration preserves the current clinical workflow and persists predictions through the
existing `AIAnalysis` and `ECGCase` records.

## Backend Integration

Implemented a local ONNX Runtime provider:

- Loads `model.onnx` with `onnxruntime-node`.
- Resolves model path from `AI_ONNX_MODEL_PATH` or standard AI engine locations:
  - `ai-engine/runs/first-real-ecg-model/model.onnx`
  - `ai-engine/artifacts/model.onnx`
  - `ai-engine/model.onnx`
- Reconstructs digitized 12-lead ECG signals when needed.
- Normalizes and pads/crops signals to the ONNX input sample length.
- Runs inference with `[1, 12, samples]` tensor input.
- Converts model logits into diagnosis probabilities.
- Maps the five-class PTB-XL benchmark output to clinical diagnoses:
  - Normal ECG
  - Atrial Fibrillation
  - LBBB
  - RBBB
  - Myocardial Infarction
- Generates interpretation, confidence score, model version, recommendations, urgent actions, and
  explainability-ready rationale.

If `model.onnx` does not exist, or 12-lead digitized signal extraction is unavailable, the current
rule-based engine is used gracefully.

## API Endpoint

Added:

```text
POST /api/v1/ecg/analyze-real-ai
```

The existing `/api` mount remains supported, so the same route is also reachable at:

```text
POST /api/ecg/analyze-real-ai
```

Request body:

```json
{
  "caseId": "ECG case UUID"
}
```

Response:

```json
{
  "analysis": {
    "diagnosis": "Atrial Fibrillation",
    "confidenceScore": 0.91,
    "aiVersion": "ecg-insight-ai-v1.0.0:onnx_runtime:ecg-insight-onnx-runtime-v1.0.0:model.onnx",
    "createdAt": "inference timestamp"
  },
  "report": {
    "reportNumber": "generated clinical report"
  }
}
```

## Persistence

The integration stores required model output fields through existing schema fields:

- Predicted diagnosis: `AIAnalysis.diagnosis` and `ECGCase.aiDiagnosis`.
- Confidence: `AIAnalysis.confidenceScore` and `ECGCase.confidenceScore`.
- Model version: `AIAnalysis.aiVersion`.
- Inference timestamp: `AIAnalysis.createdAt`.
- Clinical report: `ClinicalReport` generated after analysis.

Additional provider details and explainability rationale are recorded in audit logs and timeline
events through the existing AI analysis completion path.

## Frontend Integration

Updated the ECG Analysis page:

- The primary case action now calls the real AI endpoint.
- Displays AI diagnosis.
- Displays confidence percentage.
- Displays model version or rule-based fallback label.
- Keeps the existing explainability panel.
- Adds a clinical disclaimer in the review summary.
- Shows report generation feedback after real AI analysis completes.

## Fallback Behavior

Fallback is intentionally conservative:

- No `model.onnx`: use the current rule-based engine.
- ONNX model exists but lacks valid input/output metadata: use the current rule-based engine.
- ECG image cannot be reconstructed into 12 leads: use the current rule-based engine with rationale.

This prevents blank or failed clinical workflows when trained model artifacts are not deployed.

## Validation

Completed:

```bash
npm run build
npm run lint
npm run test
```

Result: Passed.

## Clinical Safety

The ONNX model output is decision-support only. ECG Insight displays a clinical disclaimer and keeps
doctor review in the workflow. No AI prediction should be treated as a final diagnosis without
qualified physician review, correlation with the source ECG, symptoms, serial ECGs, and relevant
laboratory results.
