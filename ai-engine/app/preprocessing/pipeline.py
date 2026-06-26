from dataclasses import dataclass, field

import numpy as np

from app.schemas import ECGAnalysisRequest, LeadSignal


@dataclass
class PreprocessedECG:
    leads: list[LeadSignal]
    quality_score: float
    quality_reasons: list[str] = field(default_factory=list)


class ECGPreprocessingPipeline:
    """Target preprocessing boundary for image and waveform ECG inputs."""

    def run(self, request: ECGAnalysisRequest) -> PreprocessedECG:
        if request.leads:
            return self._preprocess_waveform(request.leads)

        return PreprocessedECG(
            leads=[],
            quality_score=0.0,
            quality_reasons=[
                "No waveform leads supplied. Image/PDF enhancement and signal extraction are scaffolded but not implemented.",
            ],
        )

    def _preprocess_waveform(self, leads: list[LeadSignal]) -> PreprocessedECG:
        normalized: list[LeadSignal] = []
        reasons: list[str] = []

        for lead in leads:
            samples = np.asarray(lead.samples, dtype=np.float32)
            if samples.size < lead.sampling_rate_hz * 2:
                reasons.append(f"{lead.lead}: short signal duration")
            centered = samples - float(np.mean(samples)) if samples.size else samples
            scale = float(np.max(np.abs(centered))) if centered.size else 1.0
            safe_scale = scale if scale > 1e-6 else 1.0
            normalized.append(
                LeadSignal(
                    lead=lead.lead,
                    sampling_rate_hz=lead.sampling_rate_hz,
                    samples=(centered / safe_scale).astype(float).tolist(),
                ),
            )

        quality = 0.9 if len(normalized) >= 12 and not reasons else 0.65
        return PreprocessedECG(leads=normalized, quality_score=quality, quality_reasons=reasons)
