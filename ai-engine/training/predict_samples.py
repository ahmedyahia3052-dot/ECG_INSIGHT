import argparse
import json
from pathlib import Path

import torch
from torch.utils.data import DataLoader

from training.data import TorchECGDataset, load_dataset
from training.train import build_model


def predict(args: argparse.Namespace) -> None:
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    source_dataset = load_dataset(args.dataset, args.data_root, args.manifest, split=args.split)
    if not len(source_dataset):
        source_dataset = load_dataset(args.dataset, args.data_root, args.manifest)
    dataset = TorchECGDataset(source_dataset, max_samples=int(checkpoint.get("max_samples", 5000)))
    loader = DataLoader(dataset, batch_size=1)
    label_names = checkpoint["label_names"]
    model = build_model(checkpoint.get("model", args.model), num_classes=len(label_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    predictions = []
    with torch.no_grad():
        for index, (signals, labels) in enumerate(loader):
            if index >= args.limit:
                break
            probabilities = torch.sigmoid(model(signals))[0].cpu().tolist()
            predictions.append(
                {
                    "index": index,
                    "labels": {
                        label: bool(labels[0, label_index].item())
                        for label_index, label in enumerate(label_names)
                    },
                    "probabilities": {
                        label: round(float(probabilities[label_index]), 6)
                        for label_index, label in enumerate(label_names)
                    },
                },
            )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(predictions, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output), "samples": len(predictions)}, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate sample ECG model predictions.")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--dataset", choices=["ptb-xl", "mit-bih", "physionet"], default="ptb-xl")
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--manifest", default="ptbxl_manifest.csv")
    parser.add_argument("--split", default="test")
    parser.add_argument("--model", choices=["cnn", "hybrid"], default="cnn")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--output", default="runs/first-real-ecg-model/sample_predictions.json")
    return parser.parse_args()


if __name__ == "__main__":
    predict(parse_args())
