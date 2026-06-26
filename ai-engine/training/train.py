import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split

from models.cnn import BaselineECGCNN
from models.hybrid_cnn_transformer import HybridCNNTransformer
from training.data import TorchECGDataset, load_dataset


def build_model(name: str, num_classes: int) -> nn.Module:
    if name == "cnn":
        return BaselineECGCNN(num_classes=num_classes)
    if name == "hybrid":
        return HybridCNNTransformer(num_classes=num_classes)
    raise ValueError(f"Unsupported model architecture: {name}")


def train(args: argparse.Namespace) -> None:
    source_dataset = load_dataset(args.dataset, args.data_root, args.manifest)
    dataset = TorchECGDataset(source_dataset, max_samples=args.max_samples)
    validation_size = max(1, int(len(dataset) * args.validation_fraction))
    train_size = len(dataset) - validation_size
    train_dataset, validation_dataset = random_split(dataset, [train_size, validation_size])

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    validation_loader = DataLoader(validation_dataset, batch_size=args.batch_size)

    model = build_model(args.model, num_classes=len(source_dataset.label_names))
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    criterion = nn.BCEWithLogitsLoss()

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        for signals, labels in train_loader:
            optimizer.zero_grad(set_to_none=True)
            logits = model(signals)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += float(loss.item())

        model.eval()
        validation_loss = 0.0
        with torch.no_grad():
            for signals, labels in validation_loader:
                validation_loss += float(criterion(model(signals), labels).item())

        print(
            {
                "epoch": epoch + 1,
                "train_loss": running_loss / max(len(train_loader), 1),
                "validation_loss": validation_loss / max(len(validation_loader), 1),
            },
        )

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "model": args.model,
            "dataset": args.dataset,
            "label_names": source_dataset.label_names,
            "max_samples": args.max_samples,
        },
        output_dir / "checkpoint.pt",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train ECG AI baseline models.")
    parser.add_argument("--dataset", choices=["ptb-xl", "mit-bih", "physionet"], required=True)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--model", choices=["cnn", "hybrid"], default="cnn")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--validation-fraction", type=float, default=0.2)
    parser.add_argument("--max-samples", type=int, default=5000)
    parser.add_argument("--output-dir", default="runs/ecg-baseline")
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
