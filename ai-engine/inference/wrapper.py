from pathlib import Path

import numpy as np

try:
    import onnxruntime as ort
except ImportError:  # pragma: no cover - optional at scaffold time
    ort = None


class ECGInferenceWrapper:
    """ONNX Runtime inference wrapper for exported ECG models."""

    def __init__(self, model_path: str | Path, label_names: list[str], threshold: float = 0.5) -> None:
        if ort is None:
            raise RuntimeError("onnxruntime is required for ECGInferenceWrapper.")
        self.model_path = Path(model_path)
        self.label_names = label_names
        self.threshold = threshold
        self.session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def predict(self, signal: np.ndarray) -> dict[str, object]:
        if signal.ndim == 2:
            signal = signal[np.newaxis, ...]
        logits = self.session.run(None, {self.input_name: signal.astype(np.float32)})[0]
        probabilities = 1.0 / (1.0 + np.exp(-logits))
        predictions = [
            {
                "label": label,
                "probability": float(probabilities[0, index]),
                "predicted": bool(probabilities[0, index] >= self.threshold),
            }
            for index, label in enumerate(self.label_names)
        ]
        return {"predictions": predictions}
