# ECG AI Training Pipeline Report

Project: ECG Insight Enterprise Medical AI Platform  
Scope: first production-oriented ECG AI training infrastructure scaffold inside `ai-engine/`.

## Executive Summary

Built the first standalone ECG AI training pipeline infrastructure for ECG Insight. This is infrastructure only: no large models were trained, no clinical performance claims are made, and no production workflows were modified.

The new pipeline supports manifest-based loading for PTB-XL, MIT-BIH Arrhythmia, and PhysioNet-style datasets; ECG preprocessing; baseline CNN and hybrid CNN-Transformer model scaffolds; training, evaluation, metrics, export, inference wrapper, and sample benchmark workflow.

## Directory Structure Added

Inside `ai-engine/`:

- `datasets/`
- `training/`
- `models/`
- `inference/`
- `notebooks/`

These root-level directories complement the existing FastAPI scaffold under `ai-engine/app/`.

## Dataset Support

### PTB-XL

File: `ai-engine/datasets/ptb_xl.py`

Support:

- Manifest-based loader.
- Multi-label diagnosis encoding.
- CSV waveform ingestion.
- Default 12-lead labels for rhythm, conduction, hypertrophy, ischemia, and QT targets.

Expected manifest columns:

- `record_id`
- `signal_path`
- `labels`
- `sampling_rate_hz`

### MIT-BIH Arrhythmia

File: `ai-engine/datasets/mit_bih.py`

Support:

- Manifest-based loader.
- Beat and rhythm labels.
- Two-lead waveform ingestion.
- PAC, PVC, AF, flutter, VT, and beat-class targets.

Expected manifest columns:

- `record_id`
- `signal_path`
- `labels`
- `sampling_rate_hz`
- `annotation_path`

### PhysioNet

File: `ai-engine/datasets/physionet.py`

Support:

- Generic PhysioNet challenge-style manifest loader.
- Multi-label diagnosis targets aligned with the ECG AI architecture catalog.
- 12-lead CSV waveform ingestion.

Expected manifest columns:

- `record_id`
- `signal_path`
- `labels`
- `sampling_rate_hz`
- `dataset`

## Preprocessing Pipeline

File: `ai-engine/training/preprocessing.py`

Implemented:

- Resampling.
- Normalization.
- Noise filtering with moving average smoothing.
- Baseline wander removal.
- Signal clipping by standard deviation.
- `ECGPreprocessor` wrapper for training datasets.

Current scope:

- Numeric waveform preprocessing.
- Image/PDF signal extraction remains in the architecture scaffold and should be implemented later with validated computer vision tooling.

## Model Architectures

### Baseline CNN

File: `ai-engine/models/cnn.py`

Architecture:

- 1D convolution blocks.
- Batch normalization.
- ReLU activations.
- Max pooling.
- Adaptive pooling.
- Dropout.
- Linear multi-label classification head.

Purpose:

- Establish a fast baseline for ECG waveform classification.
- Support small experiments before larger validated training.

### Hybrid CNN + Transformer

File: `ai-engine/models/hybrid_cnn_transformer.py`

Architecture:

- CNN stem for local ECG morphology.
- Transformer encoder for long-range temporal context.
- Mean pooled sequence representation.
- Multi-label classification head.

Purpose:

- Scaffold the future production architecture that can combine morphology, rhythm, and cross-lead temporal patterns.

## Training Script

File: `ai-engine/training/train.py`

Capabilities:

- Select dataset: `ptb-xl`, `mit-bih`, or `physionet`.
- Select model: `cnn` or `hybrid`.
- Create PyTorch `DataLoader`.
- Train with `BCEWithLogitsLoss`.
- Save checkpoint with:
  - model weights
  - model type
  - dataset name
  - label names
  - max sample length

Example:

```bash
cd ai-engine
python -m training.train --dataset ptb-xl --data-root data/ptb-xl-sample --model cnn --epochs 1
```

## Evaluation Script

File: `ai-engine/training/evaluate.py`

Supported metrics:

- Accuracy.
- Precision.
- Recall.
- F1 score.
- AUROC.
- Multi-label confusion matrix.

Metrics implementation:

- `ai-engine/training/metrics.py`

Example:

```bash
python -m training.evaluate \
  --checkpoint runs/ecg-baseline/checkpoint.pt \
  --dataset ptb-xl \
  --data-root data/ptb-xl-sample \
  --output runs/evaluation/metrics.json
```

## Model Export

File: `ai-engine/training/export.py`

Supported exports:

- ONNX.
- TorchScript.

Example:

```bash
python -m training.export \
  --checkpoint runs/ecg-baseline/checkpoint.pt \
  --output-dir artifacts/exported-model
```

Generated artifacts:

- `ecg_model.onnx`
- `ecg_model.torchscript.pt`

## Inference Wrapper

File: `ai-engine/inference/wrapper.py`

Capabilities:

- Loads exported ONNX model with ONNX Runtime.
- Accepts ECG signal tensor.
- Applies sigmoid probabilities.
- Returns per-label probability and thresholded prediction.

Status:

- Ready for local exported-model smoke usage.
- Not wired to production FastAPI runtime yet.
- Not clinically validated.

## Sample Benchmark Workflow

Files:

- `ai-engine/training/benchmark.py`
- `ai-engine/notebooks/benchmark_workflow.md`

Benchmark script chains:

1. Train.
2. Evaluate.
3. Export to ONNX and TorchScript.
4. Write benchmark summary JSON.

Example:

```bash
python -m training.benchmark \
  --dataset ptb-xl \
  --data-root data/ptb-xl-sample \
  --manifest ptbxl_manifest.csv \
  --model cnn \
  --epochs 1 \
  --batch-size 4 \
  --run-dir runs/ptbxl-cnn-smoke
```

## Current Limitations

- No real PTB-XL, MIT-BIH, or PhysioNet data is committed.
- No large model training has been run.
- No cardiologist-adjudicated validation dataset exists in the repository.
- Metrics are infrastructure outputs only until real labeled data is supplied.
- Image/PDF signal extraction is not implemented in this training pipeline yet.
- Export requires PyTorch and ONNX export dependencies in the local Python environment.
- Clinical deployment remains blocked until validation and regulatory evidence exist.

## Production Readiness Status

Engineering infrastructure:

- Dataset loaders: ready for manifest-backed local datasets.
- Preprocessing: baseline waveform path ready.
- CNN model: scaffold ready.
- Hybrid model: scaffold ready.
- Training loop: ready for small experiments.
- Evaluation loop: ready for metrics generation.
- Export: ONNX and TorchScript scaffold ready.
- Inference wrapper: ONNX Runtime scaffold ready.

Clinical readiness:

- Not ready for diagnostic claims.
- Not ready for production clinical inference.
- Requires validated datasets, locked metrics, calibration, prospective silent-mode testing, and clinical safety review.

## Recommended Next Steps

1. Add local non-committed sample manifests under `ai-engine/data/`.
2. Download PTB-XL, MIT-BIH, and selected PhysioNet challenge datasets outside the repository.
3. Create label harmonization maps for PTB-XL SCP codes and PhysioNet labels.
4. Add patient-level train/validation/test split guards.
5. Add class imbalance handling with weighted loss or sampler.
6. Add calibration pipeline for confidence scoring.
7. Add model cards and benchmark reports per checkpoint.
8. Add CI smoke test using a tiny synthetic dataset.
9. Add FastAPI model-loading endpoint once a validated ONNX artifact exists.

## Validation Performed

Required validation:

- All Python modules compile successfully with `python -m compileall -q ai-engine`.

No large models were trained as required.
