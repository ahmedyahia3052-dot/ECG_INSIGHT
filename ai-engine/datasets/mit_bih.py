import csv
from pathlib import Path

from datasets.base import ECGSample, multi_hot, read_csv_signal


class MITBIHArrhythmiaDataset:
    """MIT-BIH arrhythmia manifest loader for beat/rhythm classification experiments."""

    label_names = [
        "normal_beat",
        "pac",
        "pvc",
        "fusion_beat",
        "unknown_beat",
        "atrial_fibrillation",
        "atrial_flutter",
        "ventricular_tachycardia",
    ]

    def __init__(self, root: str | Path, manifest: str | Path = "mitbih_manifest.csv") -> None:
        self.root = Path(root)
        self.rows = list(csv.DictReader((self.root / manifest).open(newline="", encoding="utf-8")))

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> ECGSample:
        row = self.rows[index]
        signal = read_csv_signal(self.root / row["signal_path"], expected_leads=2)
        labels = multi_hot(row.get("labels", "").split("|"), self.label_names)
        return ECGSample(
            record_id=row["record_id"],
            signal=signal,
            labels=labels,
            sampling_rate_hz=int(row.get("sampling_rate_hz") or 360),
            metadata={"dataset": "mit-bih", "annotation_path": row.get("annotation_path", "")},
        )
