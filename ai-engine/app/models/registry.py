from dataclasses import dataclass


@dataclass(frozen=True)
class ModelDescriptor:
    name: str
    architecture: str
    runtime: str
    version: str
    diagnoses: list[str]
    status: str


class ModelRegistry:
    """Registry placeholder for PyTorch research checkpoints and ONNX production models."""

    def __init__(self) -> None:
        self._models = [
            ModelDescriptor(
                name="ecg-cnn-baseline",
                architecture="1D CNN",
                runtime="pytorch",
                version="scaffold",
                diagnoses=["rhythm", "interval", "st_t"],
                status="planned",
            ),
            ModelDescriptor(
                name="ecg-transformer-sequence",
                architecture="Transformer encoder",
                runtime="pytorch",
                version="scaffold",
                diagnoses=["arrhythmia", "conduction", "morphology"],
                status="planned",
            ),
            ModelDescriptor(
                name="ecg-hybrid-cnn-transformer",
                architecture="CNN plus Transformer fusion",
                runtime="onnxruntime",
                version="scaffold",
                diagnoses=["multi_label_12_lead_ecg"],
                status="planned",
            ),
        ]

    def summary(self) -> list[dict[str, object]]:
        return [model.__dict__ for model in self._models]


model_registry = ModelRegistry()
