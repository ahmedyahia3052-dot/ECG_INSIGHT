import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
try:
    from torch.utils.tensorboard import SummaryWriter
except ImportError:  # pragma: no cover - tensorboard is optional until dependencies are installed
    SummaryWriter = None

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
    train_source = load_dataset(args.dataset, args.data_root, args.manifest, split="train")
    validation_source = load_dataset(args.dataset, args.data_root, args.manifest, split="validation")
    if len(train_source) and len(validation_source):
        source_dataset = train_source
        train_dataset = TorchECGDataset(train_source, max_samples=args.max_samples)
        validation_dataset = TorchECGDataset(validation_source, max_samples=args.max_samples)
    else:
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
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    writer = SummaryWriter(log_dir=str(output_dir / "tensorboard")) if SummaryWriter else None
    best_validation_loss = float("inf")
    epochs_without_improvement = 0

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
        train_loss = running_loss / max(len(train_loader), 1)
        validation_loss = validation_loss / max(len(validation_loader), 1)
        if writer:
            writer.add_scalar("loss/train", train_loss, epoch + 1)
            writer.add_scalar("loss/validation", validation_loss, epoch + 1)

        print(
            {
                "epoch": epoch + 1,
                "train_loss": train_loss,
                "validation_loss": validation_loss,
            },
        )

        checkpoint = {
            "model_state_dict": model.state_dict(),
            "model": args.model,
            "dataset": args.dataset,
            "label_names": source_dataset.label_names,
            "max_samples": args.max_samples,
            "epoch": epoch + 1,
            "validation_loss": validation_loss,
        }
        torch.save(checkpoint, output_dir / "checkpoint.pt")
        if validation_loss < best_validation_loss - args.min_delta:
            best_validation_loss = validation_loss
            epochs_without_improvement = 0
            torch.save(checkpoint, output_dir / "best_checkpoint.pt")
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= args.patience:
                print({"early_stopping": True, "epoch": epoch + 1})
                break
    if writer:
        writer.flush()
        writer.close()


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
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--min-delta", type=float, default=0.0)
    parser.add_argument("--output-dir", default="runs/ecg-baseline")
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
