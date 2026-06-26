# Sample ECG AI Benchmark Workflow

This notebook-style workflow is intentionally lightweight. It documents how to run a small benchmark once a manifest-backed dataset is available.

## 1. Prepare Data

Create a manifest such as `ptbxl_manifest.csv` with:

```csv
record_id,signal_path,labels,sampling_rate_hz
ptbxl-0001,signals/ptbxl-0001.csv,normal_sinus_rhythm,500
ptbxl-0002,signals/ptbxl-0002.csv,atrial_fibrillation|rbbb,500
```

Signal files should be CSV arrays shaped as either `[leads, samples]` or `[samples, leads]`.

## 2. Run Baseline CNN Benchmark

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

## 3. Review Metrics

Open:

- `runs/ptbxl-cnn-smoke/metrics.json`
- `runs/ptbxl-cnn-smoke/benchmark_summary.json`

Metrics include accuracy, precision, recall, F1 score, AUROC, and multilabel confusion matrices.

## 4. Review Exports

Exported artifacts:

- `runs/ptbxl-cnn-smoke/exported/ecg_model.onnx`
- `runs/ptbxl-cnn-smoke/exported/ecg_model.torchscript.pt`

## 5. Safety Note

This workflow is for infrastructure validation only. It must not be used for clinical claims until trained on approved datasets and validated with cardiologist-adjudicated ground truth.
