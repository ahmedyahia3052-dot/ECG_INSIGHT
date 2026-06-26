import argparse
import ast
import csv
import random
import re
import struct
import urllib.request
from pathlib import Path

PTBXL_BASE_URL = "https://physionet.org/files/ptb-xl/1.0.3"

TARGETS = {
    "NORM": "normal_ecg",
    "AFIB": "atrial_fibrillation",
    "CLBBB": "left_bundle_branch_block",
    "CRBBB": "right_bundle_branch_block",
    "AMI": "myocardial_infarction",
    "IMI": "myocardial_infarction",
    "ASMI": "myocardial_infarction",
    "ILMI": "myocardial_infarction",
    "LMI": "myocardial_infarction",
    "PMI": "myocardial_infarction",
}


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        return
    with urllib.request.urlopen(url, timeout=60) as response:
        destination.write_bytes(response.read())


def parse_header(header_path: Path) -> tuple[list[float], list[int], int]:
    lines = header_path.read_text(encoding="utf-8").splitlines()
    first = lines[0].split()
    sampling_rate = int(float(first[2]))
    gains: list[float] = []
    baselines: list[int] = []
    for line in lines[1:13]:
        parts = line.split()
        gain_match = re.match(r"[-+]?\d+(?:\.\d+)?", parts[2].split("/")[0])
        gains.append(float(gain_match.group(0)) if gain_match else 1.0)
        baselines.append(int(parts[4]) if len(parts) > 4 else 0)
    return gains, baselines, sampling_rate


def convert_dat_to_csv(dat_path: Path, header_path: Path, csv_path: Path) -> int:
    gains, baselines, sampling_rate = parse_header(header_path)
    leads = len(gains)
    raw_bytes = dat_path.read_bytes()
    values = struct.unpack(f"<{len(raw_bytes) // 2}h", raw_bytes)
    samples_by_lead = [[] for _ in range(leads)]
    for sample_index in range(0, len(values) - leads + 1, leads):
        frame = values[sample_index : sample_index + leads]
        for lead_index, value in enumerate(frame):
            samples_by_lead[lead_index].append(
                round((value - baselines[lead_index]) / max(gains[lead_index], 1e-6), 6),
            )
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(samples_by_lead)
    return sampling_rate


def labels_for(scp_codes: str) -> list[str]:
    parsed = ast.literal_eval(scp_codes)
    labels = {TARGETS[code] for code in parsed if code in TARGETS}
    return sorted(labels)


def split_for(index: int, total: int) -> str:
    ratio = index / max(total, 1)
    if ratio < 0.70:
        return "train"
    if ratio < 0.85:
        return "validation"
    return "test"


def prepare(args: argparse.Namespace) -> None:
    output = Path(args.output_dir)
    metadata_path = output / "raw" / "ptbxl_database.csv"
    download(f"{PTBXL_BASE_URL}/ptbxl_database.csv", metadata_path)
    rows = list(csv.DictReader(metadata_path.open(newline="", encoding="utf-8")))
    random.Random(args.seed).shuffle(rows)

    selected = []
    per_class_counts = {label: 0 for label in set(TARGETS.values())}
    for row in rows:
        labels = labels_for(row["scp_codes"])
        if not labels:
            continue
        if any(per_class_counts[label] < args.max_per_class for label in labels):
            selected.append((row, labels))
            for label in labels:
                per_class_counts[label] += 1
        if len(selected) >= args.max_records:
            break
        if all(count >= args.max_per_class for count in per_class_counts.values()):
            break

    manifest_rows = []
    for index, (row, labels) in enumerate(selected):
        record_path = row["filename_lr"]
        record_stem = Path(record_path)
        hea_path = output / "raw" / f"{record_path}.hea"
        dat_path = output / "raw" / f"{record_path}.dat"
        download(f"{PTBXL_BASE_URL}/{record_path}.hea", hea_path)
        download(f"{PTBXL_BASE_URL}/{record_path}.dat", dat_path)
        signal_path = output / "signals" / f"{record_stem.name}.csv"
        sampling_rate = convert_dat_to_csv(dat_path, hea_path, signal_path)
        manifest_rows.append(
            {
                "record_id": row["ecg_id"],
                "signal_path": str(signal_path.relative_to(output)).replace("\\", "/"),
                "labels": "|".join(labels),
                "sampling_rate_hz": sampling_rate,
                "split": split_for(index, len(selected)),
            },
        )

    manifest_path = output / "ptbxl_manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["record_id", "signal_path", "labels", "sampling_rate_hz", "split"],
        )
        writer.writeheader()
        writer.writerows(manifest_rows)
    print({"manifest": str(manifest_path), "records": len(manifest_rows), "class_counts": per_class_counts})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download and prepare a small PTB-XL benchmark subset.")
    parser.add_argument("--output-dir", default="data/ptbxl-small")
    parser.add_argument("--max-records", type=int, default=40)
    parser.add_argument("--max-per-class", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


if __name__ == "__main__":
    prepare(parse_args())
