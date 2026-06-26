from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import numpy as np


@dataclass(frozen=True)
class ECGSample:
    record_id: str
    signal: np.ndarray
    labels: np.ndarray
    sampling_rate_hz: int
    metadata: dict[str, str | int | float | bool]


class ECGDataset(Protocol):
    label_names: list[str]

    def __len__(self) -> int:
        ...

    def __getitem__(self, index: int) -> ECGSample:
        ...


def read_csv_signal(path: Path, expected_leads: int = 12) -> np.ndarray:
    signal = np.loadtxt(path, delimiter=",", dtype=np.float32)
    if signal.ndim == 1:
        signal = signal.reshape(1, -1)
    if signal.shape[0] != expected_leads and signal.shape[1] == expected_leads:
        signal = signal.T
    return signal


def multi_hot(labels: list[str], label_names: list[str]) -> np.ndarray:
    encoded = np.zeros(len(label_names), dtype=np.float32)
    label_set = {label.strip().lower() for label in labels}
    for index, name in enumerate(label_names):
        if name.lower() in label_set:
            encoded[index] = 1.0
    return encoded
