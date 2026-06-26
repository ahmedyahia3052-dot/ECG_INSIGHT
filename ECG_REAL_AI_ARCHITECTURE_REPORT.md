# ECG Real AI Engine Architecture Report

Project: ECG Insight Enterprise Medical AI Platform  
Scope: architecture and non-production scaffold for a future validated ECG AI microservice.

## Executive Summary

The current ECG workflow is clinically useful as enterprise workflow infrastructure, but the in-repository diagnostic engine is not yet a real validated AI engine. It is primarily deterministic signal/image preprocessing plus rule-based diagnosis. A `deep_learning` provider exists in the Node backend, but it is an adapter around an optional external endpoint and falls back to the rule engine when no endpoint is configured.

This report defines the target architecture for a dedicated Python AI microservice using FastAPI, PyTorch, and ONNX Runtime. A standalone scaffold has been added under `ai-engine/`. It is intentionally not wired into production workflows yet.

## Current ECG Workflow Audit

### Current Backend Flow

Current production flow:

1. ECG file is uploaded and linked to an ECG case.
2. Node backend stores file metadata and case state.
3. ECG processing services attempt waveform parsing or image-derived digitization.
4. `AIAnalysis` records are queued and completed by the Node AI service.
5. `getAIProvider()` selects `rule_based`, `mock`, or `deep_learning`.
6. Default `rule_based` path calls `analyzeECG()` in `server/src/ai/engine.ts`.
7. Results update `AIAnalysis`, `ECGCase`, audit logs, timeline events, reports, notifications, and UI views.

### Current Engine Classification

- `server/src/ai/engine.ts`: rule-based diagnosis by thresholds and case text.
- `server/src/ai/providers.ts`: provider abstraction with rule-based default, mock mode, and optional deep-learning adapter.
- `server/src/modules/ecg-processing/ecg-image-analysis.service.ts`: simulated/deterministic image analysis and hard-coded lead coordinate layout.
- `server/src/modules/ecg-processing/ecg-digitization.service.ts`: synthetic waveform reconstruction from file metadata and seed values.
- `server/src/modules/ecg-processing/ecg-processing.service.ts`: deterministic waveform preprocessing and simple R-peak heuristics.
- `server/src/modules/ecg-files/ecg-clinical.service.ts`: basic file parsing and measurement extraction with synthetic fallbacks.
- `artifacts/ecg-insight/services/ai.ts` and `ecgProcessing.ts`: frontend API clients only.

### Gaps To Solve

- No dedicated model-serving microservice.
- No trained PyTorch model in repository.
- No ONNX Runtime inference path.
- No validated image-to-signal extraction model.
- No PTB-XL, MIT-BIH, or PhysioNet training pipeline.
- No clinical model registry or model provenance contract.
- No calibrated confidence scoring.
- No model explainability attribution.
- No asynchronous analysis job protocol between backend and AI engine.
- No strict fail-closed behavior for unavailable AI model inference.

## Target Architecture

### Service Boundary

Introduce a standalone AI engine service:

- Runtime: Python 3.11+
- API: FastAPI
- Research/training: PyTorch
- Production inference: ONNX Runtime
- Contracts: Pydantic schemas
- Deployment: independent container, scaled separately from the Node backend
- Integration status: future only, no current production wiring

The Node/Nest-compatible backend should remain the system of record for:

- Authentication and authorization
- Patient, ECG case, report, audit, notification, and billing records
- File storage references
- Case state machine
- Physician review workflow

The AI engine should own:

- ECG image enhancement
- Lead segmentation
- Signal extraction
- Signal preprocessing
- Model inference
- Confidence calibration
- Explainability artifacts
- Model version metadata

## Scaffold Added

Added standalone non-production scaffold:

- `ai-engine/README.md`
- `ai-engine/pyproject.toml`
- `ai-engine/app/main.py`
- `ai-engine/app/schemas.py`
- `ai-engine/app/core/config.py`
- `ai-engine/app/preprocessing/pipeline.py`
- `ai-engine/app/models/registry.py`
- `ai-engine/app/inference/service.py`
- `ai-engine/app/explainability/service.py`
- `ai-engine/app/training/datasets.py`

The scaffold exposes:

- `GET /health`
- `GET /models`
- `POST /v1/ecg/analyze`

The scaffold deliberately returns `quality_blocked` or `deferred` statuses rather than real diagnostic output. This prevents false clinical claims before validated models exist.

## Proposed Microservice Modules

### API Layer

Responsibilities:

- Request validation
- File URI or waveform payload intake
- Model version exposure
- Structured analysis response
- Health/readiness endpoints
- Idempotency and request tracing

Target files:

- `app/main.py`
- `app/schemas.py`
- `app/api/v1/ecg.py`
- `app/api/v1/models.py`
- `app/api/v1/health.py`

### Preprocessing Layer

Responsibilities:

- ECG image enhancement
- Lead segmentation
- Signal extraction
- Noise removal
- Baseline correction
- Resampling and normalization
- Quality scoring
- Artifact and lead reversal detection

Target modules:

- `app/preprocessing/image_enhancement.py`
- `app/preprocessing/lead_segmentation.py`
- `app/preprocessing/signal_extraction.py`
- `app/preprocessing/waveform_filters.py`
- `app/preprocessing/quality.py`

### Model Layer

Responsibilities:

- PyTorch model definitions
- ONNX inference sessions
- Model registry
- Model signature validation
- Model metadata and intended-use boundaries

Target modules:

- `app/models/cnn.py`
- `app/models/transformer.py`
- `app/models/hybrid.py`
- `app/models/onnx_runner.py`
- `app/models/registry.py`

### Inference Layer

Responsibilities:

- Preprocessing orchestration
- Multi-model routing
- Ensemble decision logic
- Thresholding
- Confidence calibration
- Safety gating
- Response assembly

Target modules:

- `app/inference/service.py`
- `app/inference/calibration.py`
- `app/inference/decision_fusion.py`
- `app/inference/safety_gates.py`

### Explainability Layer

Responsibilities:

- Grad-CAM for CNN branches
- Integrated gradients for waveform sequence models
- Attention rollout for transformer layers
- Lead-level and beat-level importance maps
- Region annotations for UI overlays

Target modules:

- `app/explainability/grad_cam.py`
- `app/explainability/integrated_gradients.py`
- `app/explainability/attention_rollout.py`
- `app/explainability/service.py`

### Training Layer

Responsibilities:

- PTB-XL dataset ingestion
- MIT-BIH arrhythmia ingestion
- PhysioNet dataset ingestion
- Label harmonization
- Train/validation/test splitting
- Class imbalance handling
- Evaluation and report generation

Target modules:

- `app/training/datasets.py`
- `app/training/label_map.py`
- `app/training/train.py`
- `app/training/evaluate.py`
- `app/training/export_onnx.py`

## Preprocessing Pipeline Design

### ECG Image Enhancement

Input: scanned ECG image or PDF.

Steps:

1. Decode image/PDF page.
2. Detect ECG paper boundaries.
3. Correct perspective.
4. Deskew.
5. Remove shadows.
6. Enhance contrast.
7. Detect and normalize grid.
8. Detect calibration markers.
9. Estimate paper speed and gain.
10. Segment lead panels.
11. Extract waveform traces.
12. Validate lead order.
13. Produce digitized signals with confidence.

Recommended libraries:

- OpenCV for image geometry and thresholding.
- NumPy and SciPy for filtering.
- PyTorch segmentation model for lead/trace extraction.
- ONNX Runtime for production segmentation inference.

### Lead Segmentation

Target output:

- 12 standard leads: I, II, III, aVR, aVL, aVF, V1-V6.
- Optional rhythm strip.
- Bounding boxes for each lead.
- Trace mask for each lead.
- Lead label OCR confidence.
- Grid calibration metadata.

Safety gates:

- Block diagnosis if fewer than required diagnostic leads are extracted.
- Block STEMI territory classification if contiguous lead groups cannot be trusted.
- Emit `quality_blocked` when lead order is uncertain.

### Signal Extraction

Target output:

- Lead-wise numeric waveform.
- Sampling rate.
- Gain calibration.
- Paper speed.
- Signal confidence.
- Missing lead flags.

Core algorithms:

- Trace skeletonization.
- Grid-to-voltage/time calibration.
- Morphological cleanup.
- Baseline correction.
- Resampling to standard frequency.

### Noise Removal

Required filters:

- Baseline wander removal.
- Power-line filtering.
- Muscle artifact suppression.
- Motion artifact detection.
- Saturation/clipping detection.
- Missing segment detection.

Suggested signal processing:

- Bandpass filter around ECG diagnostic band.
- Notch filter at 50/60 Hz.
- Wavelet denoising for high-frequency noise.
- Robust baseline estimation.

### Baseline Correction

Target:

- Preserve ST segments while removing low-frequency drift.
- Avoid aggressive filtering that distorts STEMI/NSTEMI patterns.

Validation:

- Compare ST deviation before/after filtering on labeled ischemia datasets.
- Lock filter parameters before clinical validation.

## Model Architecture

### CNN Baseline

Purpose:

- Fast 1D waveform classification.
- Strong local morphology extraction.
- Useful for QRS, ST-T, ectopy, and conduction patterns.

Input:

- Tensor shape: `[batch, leads, samples]`.
- 10-second 12-lead ECG resampled to 500 Hz.

Architecture:

- Lead-wise convolution blocks.
- Residual temporal convolution blocks.
- Global average pooling.
- Multi-label classification heads.
- Auxiliary measurement heads for intervals.

Strengths:

- Efficient.
- ONNX-friendly.
- Good baseline for morphology.

Limitations:

- Less robust for long-range rhythm dependencies unless receptive field is large.

### Transformer Model

Purpose:

- Capture longer rhythm dependencies.
- Model beat-to-beat variability and temporal context.

Input:

- Patch or beat embeddings from each lead.
- Positional encodings.
- Lead embeddings.

Architecture:

- 1D patch embedding.
- Transformer encoder layers.
- Lead-aware attention.
- Multi-label diagnosis heads.
- Optional rhythm-specific head.

Strengths:

- Better for AF, flutter, PAC/PVC patterns, AV block sequences.

Limitations:

- Heavier compute.
- Needs more data and careful calibration.

### Hybrid CNN-Transformer

Purpose:

- Production target architecture.
- CNN extracts local morphology.
- Transformer models rhythm and cross-lead context.

Architecture:

- CNN stem per lead.
- Shared temporal feature extractor.
- Cross-lead attention.
- Transformer encoder.
- Multi-task heads:
  - Rhythm diagnosis
  - Ischemia/STEMI territories
  - Conduction disease
  - Hypertrophy
  - Electrolyte/QT abnormalities
  - Signal quality/artifact
  - Measurements

Deployment:

- Train in PyTorch.
- Export to ONNX.
- Serve with ONNX Runtime.
- Keep PyTorch only for research/training environment.

## Supported Diagnosis Catalog

Initial validated target diagnoses:

- Normal sinus rhythm
- Atrial fibrillation
- Atrial flutter
- PVC
- PAC
- First-degree AV block
- Second-degree AV block
- Third-degree AV block
- RBBB
- LBBB
- LVH
- RVH
- STEMI
- NSTEMI/ischemic ST-T pattern
- Pericarditis
- Hyperkalemia
- QT prolongation
- WPW
- Ventricular tachycardia
- Artifact or poor quality

Future expansion:

- SVT
- Ventricular fibrillation
- Asystole
- Brugada pattern
- Posterior MI
- Right ventricular MI
- De Winter pattern
- Wellens syndrome
- Fascicular blocks
- Paced rhythm
- Lead reversal
- Hypokalemia
- Hypocalcemia/hypercalcemia
- Digitalis effect

## Confidence Scoring

Confidence must be calibrated, not just maximum softmax probability.

Required outputs:

- Raw probability per diagnosis.
- Calibrated confidence per diagnosis.
- Class-specific threshold used.
- Quality-adjusted confidence.
- Out-of-distribution score.
- Explanation availability flag.

Recommended calibration:

- Temperature scaling on validation set.
- Isotonic regression for high-risk diagnoses.
- Class-specific decision thresholds.
- Separate calibration by signal quality.
- Separate calibration for digital waveform vs image-derived waveform.

Safety rule:

- High-risk findings should expose confidence and uncertainty.
- Low confidence should produce `needs_physician_review`, not a definitive negative.
- Poor signal quality should block diagnosis rather than return false precision.

## Explainability Layer

Explainability outputs:

- Lead-level importance.
- Time-window importance.
- Beat-level annotations.
- ST segment, QRS, P-wave, T-wave region evidence.
- Model attention summaries.
- Human-readable evidence statements.

Methods:

- Grad-CAM for CNN morphology branches.
- Integrated gradients for sequence-level waveform input.
- Attention rollout for transformer layers.
- Lead ablation sensitivity.
- Counterfactual threshold evidence for intervals.

API response should include:

- Lead name.
- Start/end milliseconds.
- Importance score.
- Finding label.
- Region type.
- Model branch source.

## Dataset Strategy

### PTB-XL

Use for:

- Multi-label 12-lead diagnostic classification.
- Normal, MI, ST/T changes, conduction disturbance, hypertrophy, rhythm labels.
- Demographic and metadata-aware validation.

Required tasks:

- SCP code mapping.
- Multi-label harmonization.
- Train/validation/test split preservation.
- External holdout split.

### MIT-BIH

Use for:

- Beat-level arrhythmia detection.
- PAC/PVC and rhythm irregularity models.
- AF-like rhythm evaluation when combined with related PhysioNet datasets.

Required tasks:

- Beat annotation ingestion.
- Segment window generation.
- Class imbalance handling.
- Patient-level split to prevent leakage.

### PhysioNet

Use for:

- Challenge datasets.
- AF, arrhythmia, 12-lead classification, noise robustness, and external validation.

Required tasks:

- Dataset-specific label maps.
- License tracking.
- Provenance metadata.
- Multi-site validation.

## REST API Contract Between Backend and AI Engine

### Analyze ECG

Endpoint:

`POST /v1/ecg/analyze`

Request:

```json
{
  "case_id": "case uuid from backend",
  "patient_id": "optional patient uuid",
  "modality": "waveform",
  "file_uri": "s3://bucket/ecg-file.xml",
  "leads": [
    {
      "lead": "II",
      "sampling_rate_hz": 500,
      "samples": [0.01, 0.02, 0.5]
    }
  ],
  "metadata": {
    "source": "GE MUSE",
    "paper_speed_mm_per_sec": 25,
    "gain_mm_per_mv": 10
  },
  "requested_outputs": ["diagnosis", "measurements", "explainability"]
}
```

Response:

```json
{
  "case_id": "case uuid from backend",
  "engine_version": "ecg-ai-engine-1.0.0",
  "model_version": "hybrid-cnn-transformer-2026-validated",
  "status": "completed",
  "quality_score": 0.96,
  "quality_reasons": [],
  "measurements": {
    "heart_rate_bpm": 72,
    "pr_interval_ms": 160,
    "qrs_duration_ms": 92,
    "qt_interval_ms": 390,
    "qtc_interval_ms": 420,
    "axis_degrees": 45,
    "st_deviation_mv_by_lead": {
      "II": 0.01
    }
  },
  "predictions": [
    {
      "code": "normal_sinus_rhythm",
      "label": "Normal Sinus Rhythm",
      "probability": 0.98,
      "calibrated_confidence": 0.95,
      "severity": "normal",
      "evidence": ["Regular RR intervals", "P wave before each QRS"]
    }
  ],
  "explainability": [
    {
      "lead": "II",
      "start_ms": 120,
      "end_ms": 260,
      "importance": 0.74,
      "label": "P-QRS-T morphology"
    }
  ],
  "warnings": []
}
```

### Model Registry

Endpoint:

`GET /models`

Purpose:

- Expose deployed model names.
- Expose model versions.
- Expose intended-use status.
- Expose whether model is validated, experimental, or disabled.

### Health

Endpoint:

`GET /health`

Purpose:

- Liveness probe.
- Deployment readiness.
- Used by backend before submitting jobs.

## Backend Integration Plan

No production workflow was modified in this phase.

Future integration steps:

1. Add backend environment variables:
   - `ECG_AI_ENGINE_URL`
   - `ECG_AI_ENGINE_API_KEY`
   - `ECG_AI_ENGINE_TIMEOUT_MS`
   - `ECG_AI_ENGINE_FAIL_MODE`
2. Add a backend adapter separate from the current provider:
   - `FastApiEcgAIProvider`
   - strict response schema validation
   - fail-closed behavior for high-risk diagnoses
3. Send only authorized case/file references or signed file URLs.
4. Store full engine provenance in `AIAnalysis`:
   - engine version
   - model version
   - calibration version
   - dataset validation version
   - preprocessing version
5. Require physician review before critical output affects final report.
6. Keep current rule-based provider as fallback only for non-diagnostic demo mode.

## Security and Compliance

Required controls:

- Service-to-service authentication.
- mTLS or signed JWT between backend and AI engine.
- Signed short-lived file URLs.
- No patient data in logs.
- Audit request ID propagation.
- Model and dataset provenance.
- Immutable model artifacts.
- SBOM for Python dependencies.
- GPU/CPU runtime reproducibility.

## Deployment Architecture

Recommended deployment:

- Node backend remains API gateway and clinical system of record.
- AI engine runs in a separate container.
- Object storage stores ECG files.
- AI engine retrieves files through signed URLs.
- Queue layer can be added for long-running inference.
- ONNX Runtime CPU starts first; GPU provider can be enabled later.

Recommended services:

- `ecg-api`: existing Node backend.
- `ecg-ai-engine`: FastAPI inference.
- `ecg-ai-worker`: optional async batch worker.
- `ecg-model-registry`: versioned artifact store.
- `ecg-validation-runner`: offline validation pipeline.

## Validation Requirements Before Production Use

Before enabling this service for clinical outputs:

- Train or import validated model weights.
- Freeze preprocessing pipeline.
- Export ONNX model.
- Validate against locked PTB-XL/MIT-BIH/PhysioNet-derived cohorts.
- Run external holdout evaluation.
- Produce per-diagnosis confusion matrices.
- Calibrate confidence scores.
- Perform subgroup validation by age, sex, device, modality, and signal quality.
- Run silent-mode prospective validation.
- Complete clinical safety risk review.

## Implementation Roadmap

Phase 1: scaffold and contract.

- Add standalone FastAPI service scaffold.
- Define Pydantic request/response schemas.
- Define diagnosis catalog.
- Define model registry interface.
- Keep production workflow unchanged.

Phase 2: data ingestion.

- Implement PTB-XL manifest loader.
- Implement MIT-BIH beat annotation loader.
- Implement PhysioNet dataset loader.
- Add label harmonization.
- Add patient-level split safeguards.

Phase 3: preprocessing.

- Implement waveform filters and QRS detection.
- Implement image enhancement.
- Implement lead segmentation.
- Implement signal extraction from images.
- Add quality gates.

Phase 4: model training.

- Train CNN baseline.
- Train transformer sequence model.
- Train hybrid CNN-transformer model.
- Evaluate multi-label performance.
- Export ONNX.

Phase 5: explainability and calibration.

- Add Grad-CAM.
- Add integrated gradients.
- Add transformer attention rollout.
- Add confidence calibration.
- Add OOD detection.

Phase 6: backend integration.

- Add backend AI engine adapter.
- Add schema validation.
- Add fail-closed behavior.
- Add model provenance persistence.
- Enable in staging only.

Phase 7: clinical validation.

- Run retrospective validation.
- Run prospective silent-mode validation.
- Prepare regulatory-style evidence.
- Gate production use on clinical safety board sign-off.

## Final Recommendation

Build the real ECG AI engine as a separate validated Python service, not as another set of rules in the Node backend. Keep the existing workflow as the enterprise clinical shell and system of record. Let the AI service own preprocessing, inference, confidence calibration, and explainability, with strict provenance and fail-closed behavior.

The scaffold added in `ai-engine/` is the correct next boundary. It is intentionally non-diagnostic until trained models, locked validation datasets, calibrated thresholds, and clinical safety gates exist.
