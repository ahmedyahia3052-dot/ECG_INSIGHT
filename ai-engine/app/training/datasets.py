from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DatasetManifest:
    name: str
    root: Path
    split: str
    label_map_path: Path | None = None


class ECGDatasetCatalog:
    """Dataset manifest scaffold for future regulated model development."""

    supported_sources = ("ptb-xl", "mit-bih", "physionet")

    def validate_source(self, source: str) -> None:
        if source not in self.supported_sources:
            raise ValueError(f"Unsupported ECG dataset source: {source}")

    def manifest(self, source: str, root: str, split: str) -> DatasetManifest:
        self.validate_source(source)
        return DatasetManifest(name=source, root=Path(root), split=split)
