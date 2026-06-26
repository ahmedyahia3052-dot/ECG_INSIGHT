from app.schemas import ExplainabilityRegion


class ExplainabilityService:
    """Future Grad-CAM, integrated gradients, and attention rollout boundary."""

    def regions_for_quality_block(self) -> list[ExplainabilityRegion]:
        return [
            ExplainabilityRegion(
                lead="global",
                start_ms=0,
                end_ms=0,
                importance=1.0,
                label="Analysis blocked because validated signal extraction is unavailable.",
            ),
        ]


explainability_service = ExplainabilityService()
