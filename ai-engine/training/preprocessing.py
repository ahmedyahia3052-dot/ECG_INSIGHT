from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class PreprocessingConfig:
    target_sampling_rate_hz: int = 500
    lowpass_window: int = 5
    baseline_window: int = 201
    clip_std: float = 8.0


def resample_signal(signal: np.ndarray, source_rate_hz: int, target_rate_hz: int) -> np.ndarray:
    if source_rate_hz == target_rate_hz:
        return signal.astype(np.float32)
    leads, samples = signal.shape
    duration = samples / source_rate_hz
    target_samples = max(1, int(round(duration * target_rate_hz)))
    source_x = np.linspace(0, duration, samples, endpoint=False)
    target_x = np.linspace(0, duration, target_samples, endpoint=False)
    return np.vstack([np.interp(target_x, source_x, signal[lead]) for lead in range(leads)]).astype(
        np.float32,
    )


def moving_average(signal: np.ndarray, window: int) -> np.ndarray:
    if window <= 1:
        return signal.astype(np.float32)
    kernel = np.ones(window, dtype=np.float32) / window
    return np.vstack([np.convolve(lead, kernel, mode="same") for lead in signal]).astype(np.float32)


def remove_baseline_wander(signal: np.ndarray, window: int = 201) -> np.ndarray:
    baseline = moving_average(signal, window)
    return (signal - baseline).astype(np.float32)


def noise_filter(signal: np.ndarray, window: int = 5) -> np.ndarray:
    return moving_average(signal, window)


def normalize_signal(signal: np.ndarray, clip_std: float = 8.0) -> np.ndarray:
    mean = signal.mean(axis=1, keepdims=True)
    std = signal.std(axis=1, keepdims=True)
    safe_std = np.where(std < 1e-6, 1.0, std)
    normalized = (signal - mean) / safe_std
    return np.clip(normalized, -clip_std, clip_std).astype(np.float32)


class ECGPreprocessor:
    def __init__(self, config: PreprocessingConfig | None = None) -> None:
        self.config = config or PreprocessingConfig()

    def transform(self, signal: np.ndarray, source_rate_hz: int) -> np.ndarray:
        resampled = resample_signal(
            signal,
            source_rate_hz=source_rate_hz,
            target_rate_hz=self.config.target_sampling_rate_hz,
        )
        baseline_removed = remove_baseline_wander(resampled, self.config.baseline_window)
        filtered = noise_filter(baseline_removed, self.config.lowpass_window)
        return normalize_signal(filtered, self.config.clip_std)
