from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class InputModality(str, Enum):
    IMAGE = "image"
    PDF = "pdf"
    WAVEFORM = "waveform"
    DICOM = "dicom"
    XML = "xml"


class DiagnosisCode(str, Enum):
    NORMAL_SINUS_RHYTHM = "normal_sinus_rhythm"
    ATRIAL_FIBRILLATION = "atrial_fibrillation"
    ATRIAL_FLUTTER = "atrial_flutter"
    PVC = "pvc"
    PAC = "pac"
    FIRST_DEGREE_AV_BLOCK = "first_degree_av_block"
    SECOND_DEGREE_AV_BLOCK = "second_degree_av_block"
    THIRD_DEGREE_AV_BLOCK = "third_degree_av_block"
    RBBB = "rbbb"
    LBBB = "lbbb"
    LVH = "lvh"
    RVH = "rvh"
    STEMI = "stemi"
    NSTEMI_PATTERN = "nstemi_pattern"
    PERICARDITIS = "pericarditis"
    HYPERKALEMIA = "hyperkalemia"
    QT_PROLONGATION = "qt_prolongation"
    WPW = "wpw"
    VENTRICULAR_TACHYCARDIA = "ventricular_tachycardia"
    ARTIFACT_OR_POOR_QUALITY = "artifact_or_poor_quality"


class LeadSignal(BaseModel):
    lead: str
    sampling_rate_hz: int = Field(gt=0)
    samples: list[float]


class ECGAnalysisRequest(BaseModel):
    case_id: str
    patient_id: str | None = None
    modality: InputModality
    file_uri: str | None = None
    leads: list[LeadSignal] = Field(default_factory=list)
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    requested_outputs: list[Literal["diagnosis", "measurements", "explainability"]] = Field(
        default_factory=lambda: ["diagnosis", "measurements", "explainability"],
    )


class ECGMeasurement(BaseModel):
    heart_rate_bpm: float | None = None
    pr_interval_ms: float | None = None
    qrs_duration_ms: float | None = None
    qt_interval_ms: float | None = None
    qtc_interval_ms: float | None = None
    axis_degrees: float | None = None
    st_deviation_mv_by_lead: dict[str, float] = Field(default_factory=dict)


class DiagnosisPrediction(BaseModel):
    code: DiagnosisCode
    label: str
    probability: float = Field(ge=0, le=1)
    calibrated_confidence: float = Field(ge=0, le=1)
    severity: Literal["normal", "mild", "moderate", "severe", "critical"]
    evidence: list[str] = Field(default_factory=list)


class ExplainabilityRegion(BaseModel):
    lead: str
    start_ms: float
    end_ms: float
    importance: float = Field(ge=0, le=1)
    label: str


class ECGAnalysisResponse(BaseModel):
    case_id: str
    engine_version: str
    model_version: str
    status: Literal["completed", "deferred", "failed", "quality_blocked"]
    quality_score: float = Field(ge=0, le=1)
    quality_reasons: list[str] = Field(default_factory=list)
    measurements: ECGMeasurement
    predictions: list[DiagnosisPrediction]
    explainability: list[ExplainabilityRegion] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
