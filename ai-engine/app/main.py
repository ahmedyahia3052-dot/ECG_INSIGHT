from fastapi import FastAPI

from app.core.config import settings
from app.inference.service import inference_service
from app.schemas import ECGAnalysisRequest, ECGAnalysisResponse

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Standalone ECG AI Engine scaffold. Not connected to production workflows.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "ecg-ai-engine"}


@app.get("/models")
def models() -> dict[str, object]:
    return inference_service.model_registry_summary()


@app.post("/v1/ecg/analyze", response_model=ECGAnalysisResponse)
def analyze_ecg(request: ECGAnalysisRequest) -> ECGAnalysisResponse:
    return inference_service.analyze(request)
