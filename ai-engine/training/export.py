import argparse
from pathlib import Path

import torch

from training.train import build_model


def export(args: argparse.Namespace) -> None:
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    label_names = checkpoint.get("label_names", [])
    model = build_model(checkpoint.get("model", args.model), num_classes=len(label_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    max_samples = int(checkpoint.get("max_samples", args.max_samples))
    example = torch.zeros(1, args.in_leads, max_samples, dtype=torch.float32)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    traced = torch.jit.trace(model, example)
    traced.save(str(output_dir / "model.torchscript.pt"))

    torch.onnx.export(
        model,
        example,
        output_dir / "model.onnx",
        input_names=["ecg"],
        output_names=["logits"],
        dynamic_axes={"ecg": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )

    print({"onnx": str(output_dir / "model.onnx"), "torchscript": str(output_dir / "model.torchscript.pt")})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export ECG AI checkpoint to ONNX and TorchScript.")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--model", choices=["cnn", "hybrid"], default="cnn")
    parser.add_argument("--in-leads", type=int, default=12)
    parser.add_argument("--max-samples", type=int, default=5000)
    parser.add_argument("--output-dir", default="artifacts/exported-model")
    return parser.parse_args()


if __name__ == "__main__":
    export(parse_args())
