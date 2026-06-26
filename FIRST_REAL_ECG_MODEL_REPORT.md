# First Real ECG Model Report

## Executive Summary

The first real ECG model workflow has been implemented for ECG Insight's standalone `ai-engine`.
It prepares a small real PTB-XL benchmark subset, trains the baseline CNN, logs TensorBoard
events, applies early stopping, saves checkpoints, evaluates held-out test metrics, exports
`model.onnx`, and writes sample inference predictions.

Local training could not complete in this workstation session because the only installed Python
interpreter is Python 3.14 and the environment does not have NumPy or PyTorch installed. PyTorch is
currently expected to run under a supported Python 3.11/3.12 environment for this project.

## Implemented Scope

- Added a PTB-XL small-subset preparation script:
  - Downloads PTB-XL metadata from PhysioNet.
  - Selects a small benchmark subset for the requested diagnostic classes.
  - Downloads selected `.hea` and `.dat` waveform records.
  - Converts WFDB 16-bit signal files into 12-lead CSV tensors.
  - Writes `ptbxl_manifest.csv` with `train`, `validation`, and `test` splits.
- Updated PTB-XL dataset loading to support the required five-class label space:
  - `normal_ecg`
  - `atrial_fibrillation`
  - `left_bundle_branch_block`
  - `right_bundle_branch_block`
  - `myocardial_infarction`
- Upgraded training:
  - Baseline CNN training.
  - 70% train, 15% validation, 15% test split support through manifest splits.
  - Early stopping.
  - Best checkpoint and latest checkpoint saving.
  - TensorBoard loss logging.
- Upgraded evaluation/export:
  - Test split evaluation.
  - Accuracy, precision, recall, F1, AUROC, and confusion matrix output.
  - ONNX export to `model.onnx`.
  - TorchScript export to `model.torchscript.pt`.
  - Sample prediction export to `sample_predictions.json`.
- Added a single orchestration command:

```bash
python -m training.train_first_ptbxl_model --prepare --max-records 40 --epochs 4 --batch-size 4
```

## Local PTB-XL Subset Preparation Evidence

The PTB-XL preparation script successfully downloaded and converted a small real PTB-XL subset.

Command:

```bash
python -m training.prepare_ptbxl_subset --output-dir data/ptbxl-small --max-records 30 --max-per-class 6 --seed 7
```

Result:

```json
{
  "manifest": "data\\ptbxl-small\\ptbxl_manifest.csv",
  "records": 29,
  "class_counts": {
    "myocardial_infarction": 10,
    "normal_ecg": 6,
    "right_bundle_branch_block": 6,
    "left_bundle_branch_block": 6,
    "atrial_fibrillation": 7
  }
}
```

The generated dataset lives under `ai-engine/data/ptbxl-small`, which is intentionally ignored by
Git to avoid committing medical data or model artifacts.

## Training Attempt

Command:

```bash
python -m training.train_first_ptbxl_model --data-root data/ptbxl-small --run-dir runs/first-real-ecg-model --epochs 2 --batch-size 4 --max-samples 1200
```

Result:

```text
ModuleNotFoundError: No module named 'numpy'
```

Earlier dependency probing also confirmed:

```text
ModuleNotFoundError: No module named 'torch'
```

Installed Python interpreters:

```text
Python 3.14 only
```

## Completion Status

- PTB-XL dataset: Implemented and real subset prepared locally.
- Small benchmark subset: Completed locally with 29 records.
- Baseline CNN model training: Implemented, blocked locally by missing ML runtime.
- Required diagnoses: Implemented and subset contains all five requested classes.
- 70/15/15 split: Implemented in the manifest-driven workflow.
- Early stopping: Implemented.
- Checkpoint saving: Implemented.
- TensorBoard logging: Implemented.
- Metrics: Accuracy, precision, recall, F1, AUROC, and confusion matrix are implemented.
- `model.onnx`: Export implemented, not generated locally because training could not run.
- Benchmark metrics: Save path implemented, not generated locally because training could not run.
- Sample predictions: Export implemented, not generated locally because training could not run.

## Commands To Complete Training

Use Python 3.11 or 3.12:

```bash
cd ai-engine
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -e .
python -m training.train_first_ptbxl_model --prepare --max-records 40 --epochs 4 --batch-size 4
```

Expected outputs:

- `ai-engine/runs/first-real-ecg-model/best_checkpoint.pt`
- `ai-engine/runs/first-real-ecg-model/checkpoint.pt`
- `ai-engine/runs/first-real-ecg-model/tensorboard/`
- `ai-engine/runs/first-real-ecg-model/metrics.json`
- `ai-engine/runs/first-real-ecg-model/model.onnx`
- `ai-engine/runs/first-real-ecg-model/model.torchscript.pt`
- `ai-engine/runs/first-real-ecg-model/sample_predictions.json`

## Clinical Safety Note

This benchmark is intentionally tiny and is not clinically valid. It is useful only as the first
real-data engineering proof that PTB-XL data can flow through the ECG Insight AI training stack.
Any clinical use requires a much larger curated dataset, patient-level leakage controls, external
validation, calibration, bias analysis, cardiologist adjudication, locked model versioning, and
regulated-device quality controls.
