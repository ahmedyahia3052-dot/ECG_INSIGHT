import argparse
import json
from pathlib import Path

from training.evaluate import evaluate
from training.export import export
from training.train import train


def benchmark(args: argparse.Namespace) -> None:
    run_dir = Path(args.run_dir)
    checkpoint = run_dir / "checkpoint.pt"
    metrics = run_dir / "metrics.json"
    export_dir = run_dir / "exported"

    train_args = argparse.Namespace(
        dataset=args.dataset,
        data_root=args.data_root,
        manifest=args.manifest,
        model=args.model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        validation_fraction=args.validation_fraction,
        max_samples=args.max_samples,
        output_dir=str(run_dir),
    )
    train(train_args)

    evaluate(
        argparse.Namespace(
            checkpoint=str(checkpoint),
            dataset=args.dataset,
            data_root=args.data_root,
            manifest=args.manifest,
            model=args.model,
            batch_size=args.batch_size,
            threshold=args.threshold,
            output=str(metrics),
        ),
    )

    export(
        argparse.Namespace(
            checkpoint=str(checkpoint),
            model=args.model,
            in_leads=12,
            max_samples=args.max_samples,
            output_dir=str(export_dir),
        ),
    )

    summary = {"checkpoint": str(checkpoint), "metrics": str(metrics), "export_dir": str(export_dir)}
    (run_dir / "benchmark_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(summary)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a sample ECG AI benchmark workflow.")
    parser.add_argument("--dataset", choices=["ptb-xl", "mit-bih", "physionet"], required=True)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--model", choices=["cnn", "hybrid"], default="cnn")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--validation-fraction", type=float, default=0.2)
    parser.add_argument("--max-samples", type=int, default=5000)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--run-dir", default="runs/sample-benchmark")
    return parser.parse_args()


if __name__ == "__main__":
    benchmark(parse_args())
