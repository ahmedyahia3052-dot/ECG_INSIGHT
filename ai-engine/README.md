# ECG Insight AI Engine Scaffold

Standalone architecture scaffold for the future ECG AI microservice.

This service is intentionally not wired into the production Node/Expo workflow yet. It defines the target boundary for a FastAPI, PyTorch, and ONNX Runtime inference service that can later be trained and validated against PTB-XL, MIT-BIH, and PhysioNet datasets.

## Intended Runtime

- Python 3.11+
- FastAPI for REST serving
- PyTorch for research/training
- ONNX Runtime for production inference
- Pydantic for API contracts

## Proposed Startup

```bash
cd ai-engine
python -m venv .venv
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

## Training Infrastructure

Root-level training infrastructure is available for future small experiments:

- `datasets/` manifest loaders for PTB-XL, MIT-BIH Arrhythmia, and PhysioNet.
- `training/` preprocessing, training, evaluation, metrics, benchmark, and export scripts.
- `models/` PyTorch baseline CNN and hybrid CNN-Transformer scaffolds.
- `inference/` ONNX Runtime wrapper for exported models.
- `notebooks/` sample benchmark workflow documentation.

Example smoke benchmark once a local manifest exists:

```bash
python -m training.benchmark --dataset ptb-xl --data-root data/ptb-xl-sample --model cnn --epochs 1
```

First real PTB-XL small-subset model workflow:

```bash
python -m training.train_first_ptbxl_model --prepare --max-records 40 --epochs 4 --batch-size 4
```

This downloads a tiny PTB-XL subset, writes a 70/15/15 manifest, trains the baseline CNN, evaluates test metrics, exports `model.onnx`, and saves `sample_predictions.json`.

Google Colab training workflow:

```bash
# Open the repository-root train_ecg_colab.ipynb in Google Colab.
# See GOOGLE_COLAB_TRAINING_GUIDE.md for the full T4 GPU workflow.
```

## Current Status

Scaffold only. Models, training weights, dataset manifests, and production integration are intentionally absent until clinical validation assets are available.
