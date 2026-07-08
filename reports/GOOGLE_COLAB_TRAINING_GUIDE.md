# Google Colab ECG Training Guide

## Purpose

`train_ecg_colab.ipynb` is the production-ready Google Colab workflow for training ECG Insight's
first baseline CNN on real PTB-XL waveform records. It is designed to run on a Colab T4 GPU without
local setup and stores all durable outputs in Google Drive.

This workflow is an engineering benchmark. It is not clinically validated and must not be used for
patient care decisions.

## Runtime Requirements

- Google Colab.
- Runtime type: Python 3.
- Hardware accelerator: T4 GPU.
- Google Drive access for checkpoints, logs, exported models, and metrics.

The notebook installs its Python dependencies automatically:

- `wfdb`
- `scikit-learn`
- `onnx`
- `onnxruntime`
- `tensorboard`
- `matplotlib`
- `tqdm`

Colab provides the CUDA-enabled PyTorch runtime on GPU-backed notebooks.

## How To Run

1. Open `train_ecg_colab.ipynb` in Google Colab.
2. Select `Runtime > Change runtime type`.
3. Set hardware accelerator to `T4 GPU`.
4. Run all cells from top to bottom.
5. Approve the Google Drive mount prompt.
6. Wait for PTB-XL records to download from PhysioNet and training to complete.

Default settings are intentionally modest so the notebook fits a Colab T4 session:

- `MAX_RECORDS = 300`
- `MAX_PER_CLASS = 80`
- `MAX_SAMPLES = 1000`
- `BATCH_SIZE = 32`
- `EPOCHS = 8`
- `PATIENCE = 3`

These values can be increased for stronger experiments after the first successful run.

## Dataset

The notebook downloads PTB-XL metadata and selected low-resolution PTB-XL waveform records from
PhysioNet automatically using `wfdb`.

The benchmark label space is:

- Normal ECG: `normal_ecg`
- Atrial fibrillation: `atrial_fibrillation`
- Left bundle branch block: `left_bundle_branch_block`
- Right bundle branch block: `right_bundle_branch_block`
- Myocardial infarction: `myocardial_infarction`

The notebook creates a deterministic 70% train, 15% validation, and 15% test split.

## Training

The model is a compact 1D baseline CNN:

- 12 input ECG leads.
- Three convolution blocks.
- Adaptive average pooling.
- Multi-label sigmoid output.
- `BCEWithLogitsLoss`.
- `AdamW` optimizer.
- Early stopping on validation loss.

Training writes TensorBoard logs to Google Drive.

## Metrics

The evaluation cell calculates and saves:

- Accuracy.
- Macro precision.
- Macro recall.
- Macro F1.
- Macro AUROC, when the held-out test split contains enough positive/negative examples.
- Per-label precision, recall, and F1.
- Multi-label confusion matrices.

## Outputs

Every run writes to:

```text
/content/drive/MyDrive/ecg-insight-training/ecg-insight-ptbxl-YYYYMMDD-HHMMSS/
```

Expected output files:

- `config.json`
- `split_summary.json`
- `training_history.csv`
- `data/ptbxl_colab_manifest.csv`
- `data/ptbxl_colab_subset.npz`
- `artifacts/checkpoint.pt`
- `artifacts/best_checkpoint.pt`
- `artifacts/model.pt`
- `artifacts/model.onnx`
- `artifacts/metrics.json`
- `artifacts/confusion_matrices.json`
- `artifacts/sample_predictions.json`
- `figures/confusion_matrices.png`
- `figures/grad_cam_*.png`
- `tensorboard/`

## TensorBoard

To view training curves inside Colab, add and run a new cell after training:

```python
%load_ext tensorboard
%tensorboard --logdir "$LOG_DIR"
```

The TensorBoard logs are also saved permanently in Google Drive under the run directory.

## Grad-CAM

The notebook generates Grad-CAM-style 1D activation maps from the final convolution block and
overlays them on lead II for several held-out test ECGs.

These visualizations are experimental and intended for model-debugging only. They are not a
clinically validated explainability method.

## Validation Checklist

After a successful Colab run, confirm:

- The runtime reports `cuda` and a T4 GPU.
- PTB-XL records download successfully from PhysioNet.
- Training prints train and validation loss for at least one epoch.
- `artifacts/best_checkpoint.pt` exists in Google Drive.
- `artifacts/model.pt` exists in Google Drive.
- `artifacts/model.onnx` exists in Google Drive.
- `artifacts/metrics.json` contains accuracy, precision, recall, F1, and AUROC fields.
- `figures/confusion_matrices.png` exists.
- `artifacts/sample_predictions.json` contains held-out predictions.
- `figures/grad_cam_*.png` exists when Grad-CAM generation completes.

## Troubleshooting

If the runtime is CPU-only, change the Colab runtime type to T4 GPU and rerun from the start.

If PhysioNet download is slow or rate-limited, reduce `MAX_RECORDS` to `100` and rerun. The workflow
will still validate the training path, exports, metrics, and predictions.

If AUROC is `null`, the held-out test split did not contain both positive and negative examples for
one or more labels. Increase `MAX_RECORDS` or `MAX_PER_CLASS` and rerun.

If Drive storage is low, delete older folders under:

```text
/content/drive/MyDrive/ecg-insight-training/
```

If ONNX export fails, rerun the export cell after confirming `artifacts/best_checkpoint.pt` exists
and the model cell has executed.

## Clinical Safety

This Colab workflow proves that ECG Insight can train a real-data model from PTB-XL and produce
portable artifacts. It does not establish diagnostic safety, sensitivity, specificity, calibration,
or regulatory readiness. Before any clinical use, the model requires large-scale dataset curation,
patient-level leakage prevention, cardiologist adjudication, external validation, locked model
versioning, bias analysis, quality management controls, and formal clinical risk review.
