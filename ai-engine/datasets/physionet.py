import csv
from pathlib import Path

from datasets.base import ECGSample, multi_hot, read_csv_signal


class PhysioNetDataset:
    """Generic PhysioNet challenge manifest loader."""

    label_names = [
        "normal_sinus_rhythm",
        "atrial_fibrillation",
        "atrial_flutter",
        "pvc",
        "pac",
        "first_degree_av_block",
        "second_degree_av_block",
        "third_degree_av_block",
        "rbbb",
        "lbbb",
        "lvh",
        "rvh",
        "stemi",
        "nstemi_pattern",
        "pericarditis",
        "hyperkalemia",
        "qt_prolongation",
        "wpw",
        "ventricular_tachycardia",
        "artifact_or_poor_quality",
    ]

    def __init__(self, root: str | Path, manifest: str | Path = "physionet_manifest.csv") -> None:
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
            metadata={"dataset": row.get("dataset", "physionet")},
        )
