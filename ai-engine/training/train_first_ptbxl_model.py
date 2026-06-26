import argparse
from pathlib import Path

from training.evaluate import evaluate
from training.export import export
from training.predict_samples import predict
from training.prepare_ptbxl_subset import prepare
from training.train import train


def run(args: argparse.Namespace) -> None:
    data_root = Path(args.data_root)
    run_dir = Path(args.run_dir)
    checkpoint = run_dir / "best_checkpoint.pt"
    if args.prepare:
        prepare(
            argparse.Namespace(
                output_dir=str(data_root),
                max_records=args.max_records,
                max_per_class=args.max_per_class,
                seed=args.seed,
            ),
        )

    train(
        argparse.Namespace(
            dataset="ptb-xl",
            data_root=str(data_root),
            manifest="ptbxl_manifest.csv",
            model="cnn",
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            validation_fraction=0.15,
            max_samples=args.max_samples,
            patience=args.patience,
            min_delta=args.min_delta,
            output_dir=str(run_dir),
        ),
    )

    evaluate(
        argparse.Namespace(
            checkpoint=str(checkpoint),
            dataset="ptb-xl",
            data_root=str(data_root),
            manifest="ptbxl_manifest.csv",
            split="test",
            model="cnn",
            batch_size=args.batch_size,
            threshold=args.threshold,
            output=str(run_dir / "metrics.json"),
        ),
    )

    export(
        argparse.Namespace(
            checkpoint=str(checkpoint),
            model="cnn",
            in_leads=12,
            max_samples=args.max_samples,
            output_dir=str(run_dir),
        ),
    )

    predict(
        argparse.Namespace(
            checkpoint=str(checkpoint),
            dataset="ptb-xl",
            data_root=str(data_root),
            manifest="ptbxl_manifest.csv",
            split="test",
            model="cnn",
            limit=args.prediction_limit,
            output=str(run_dir / "sample_predictions.json"),
        ),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare and train the first small PTB-XL ECG CNN model.")
    parser.add_argument("--data-root", default="data/ptbxl-small")
    parser.add_argument("--run-dir", default="runs/first-real-ecg-model")
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--max-records", type=int, default=40)
    parser.add_argument("--max-per-class", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--max-samples", type=int, default=2500)
    parser.add_argument("--patience", type=int, default=2)
    parser.add_argument("--min-delta", type=float, default=0.0)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--prediction-limit", type=int, default=5)
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
