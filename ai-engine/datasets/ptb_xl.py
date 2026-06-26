import csv
from pathlib import Path

from datasets.base import ECGSample, multi_hot, read_csv_signal


class PTBXLDataset:
    """PTB-XL manifest loader.

    Expected manifest columns:
    record_id,signal_path,labels,sampling_rate_hz

    Labels are pipe-separated and mapped to the configured label list.
    """

    label_names = [
        "normal_sinus_rhythm",
        "atrial_fibrillation",
        "atrial_flutter",
        "pvc",
        "pac",
        "rbbb",
        "lbbb",
        "lvh",
        "rvh",
        "stemi",
        "nstemi_pattern",
        "qt_prolongation",
    ]

    def __init__(self, root: str | Path, manifest: str | Path = "ptbxl_manifest.csv") -> None:
        self.root = Path(root)
        self.rows = list(csv.DictReader((self.root / manifest).open(newline="", encoding="utf-8")))

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> ECGSample:
        row = self.rows[index]
        signal = read_csv_signal(self.root / row["signal_path"])
        labels = multi_hot(row.get("labels", "").split("|"), self.label_names)
        return ECGSample(
            record_id=row["record_id"],
            signal=signal,
            labels=labels,
            sampling_rate_hz=int(row.get("sampling_rate_hz") or 500),
            metadata={"dataset": "ptb-xl"},
        )
