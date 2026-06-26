from app.explainability.service import explainability_service
from app.models.registry import model_registry
from app.preprocessing.pipeline import ECGPreprocessingPipeline
from app.schemas import (
    DiagnosisCode,
    DiagnosisPrediction,
    ECGAnalysisRequest,
    ECGAnalysisResponse,
    ECGMeasurement,
)


class InferenceService:
    """Inference orchestrator scaffold.

    This intentionally avoids diagnostic claims until trained models and validation assets exist.
    """

    def __init__(self) -> None:
        self.preprocessing = ECGPreprocessingPipeline()

    def model_registry_summary(self) -> dict[str, object]:
        return {"models": model_registry.summary()}

    def analyze(self, request: ECGAnalysisRequest) -> ECGAnalysisResponse:
        preprocessed = self.preprocessing.run(request)
        if not preprocessed.leads:
            return ECGAnalysisResponse(
                case_id=request.case_id,
                engine_version="ecg-ai-engine-scaffold-0.1.0",
                model_version="none",
                status="quality_blocked",
                quality_score=preprocessed.quality_score,
                quality_reasons=preprocessed.quality_reasons,
                measurements=ECGMeasurement(),
                predictions=[
                    DiagnosisPrediction(
                        code=DiagnosisCode.ARTIFACT_OR_POOR_QUALITY,
                        label="Analysis blocked - validated ECG signal unavailable",
                        probability=1.0,
                        calibrated_confidence=1.0,
                        severity="normal",
                        evidence=preprocessed.quality_reasons,
                    ),
                ],
                explainability=explainability_service.regions_for_quality_block(),
                warnings=[
                    "Scaffold response only. No trained PyTorch or ONNX ECG model has been executed.",
                ],
            )

        return ECGAnalysisResponse(
            case_id=request.case_id,
            engine_version="ecg-ai-engine-scaffold-0.1.0",
            model_version="planned-hybrid-cnn-transformer",
            status="deferred",
            quality_score=preprocessed.quality_score,
            quality_reasons=preprocessed.quality_reasons,
            measurements=ECGMeasurement(),
            predictions=[],
            explainability=[],
            warnings=[
                "Validated model inference is not implemented in the scaffold.",
                "NestJS/Node integration must not promote this response to a clinical diagnosis.",
            ],
        )


inference_service = InferenceService()
