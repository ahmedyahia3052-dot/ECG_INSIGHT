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

## Current Status

Scaffold only. Models, training weights, dataset manifests, and production integration are intentionally absent until clinical validation assets are available.
