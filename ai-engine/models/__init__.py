"""PyTorch model architectures for ECG AI training."""

from models.cnn import BaselineECGCNN
from models.hybrid_cnn_transformer import HybridCNNTransformer

__all__ = ["BaselineECGCNN", "HybridCNNTransformer"]
