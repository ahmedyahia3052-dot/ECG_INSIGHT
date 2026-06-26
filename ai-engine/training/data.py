from pathlib import Path

import numpy as np
import torch
from torch.utils.data import Dataset

from datasets.mit_bih import MITBIHArrhythmiaDataset
from datasets.physionet import PhysioNetDataset
from datasets.ptb_xl import PTBXLDataset
from training.preprocessing import ECGPreprocessor


class TorchECGDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(self, source_dataset, max_samples: int = 5000) -> None:
        self.source_dataset = source_dataset
        self.preprocessor = ECGPreprocessor()
        self.max_samples = max_samples

    def __len__(self) -> int:
        return len(self.source_dataset)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        sample = self.source_dataset[index]
        signal = self.preprocessor.transform(sample.signal, sample.sampling_rate_hz)
        signal = self._pad_or_crop(signal, self.max_samples)
        return torch.from_numpy(signal), torch.from_numpy(sample.labels.astype(np.float32))

    def _pad_or_crop(self, signal: np.ndarray, max_samples: int) -> np.ndarray:
        if signal.shape[1] == max_samples:
            return signal
        if signal.shape[1] > max_samples:
            return signal[:, :max_samples]
        pad_width = max_samples - signal.shape[1]
        return np.pad(signal, ((0, 0), (0, pad_width)), mode="constant").astype(np.float32)


def load_dataset(name: str, root: str | Path, manifest: str | None = None, split: str | None = None):
    normalized = name.lower()
    if normalized == "ptb-xl":
        return PTBXLDataset(root, manifest or "ptbxl_manifest.csv", split=split)
    if normalized == "mit-bih":
        return MITBIHArrhythmiaDataset(root, manifest or "mitbih_manifest.csv")
    if normalized == "physionet":
        return PhysioNetDataset(root, manifest or "physionet_manifest.csv")
    raise ValueError(f"Unsupported dataset: {name}")
