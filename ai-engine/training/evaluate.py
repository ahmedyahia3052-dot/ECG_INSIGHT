import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

from training.data import TorchECGDataset, load_dataset
from training.metrics import compute_metrics
from training.train import build_model


def evaluate(args: argparse.Namespace) -> None:
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    source_dataset = load_dataset(args.dataset, args.data_root, args.manifest)
    dataset = TorchECGDataset(source_dataset, max_samples=int(checkpoint.get("max_samples", 5000)))
    loader = DataLoader(dataset, batch_size=args.batch_size)

    model = build_model(checkpoint.get("model", args.model), num_classes=len(source_dataset.label_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_probabilities = []
    all_labels = []
    with torch.no_grad():
        for signals, labels in loader:
            probabilities = torch.sigmoid(model(signals)).cpu().numpy()
            all_probabilities.append(probabilities)
            all_labels.append(labels.cpu().numpy())

    y_score = np.vstack(all_probabilities)
    y_true = np.vstack(all_labels)
    metrics = compute_metrics(y_true, y_score, threshold=args.threshold)
    metrics["label_names"] = source_dataset.label_names

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate ECG AI checkpoints.")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--dataset", choices=["ptb-xl", "mit-bih", "physionet"], required=True)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--model", choices=["cnn", "hybrid"], default="cnn")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--output", default="runs/evaluation/metrics.json")
    return parser.parse_args()


if __name__ == "__main__":
    evaluate(parse_args())
