import torch
from torch import nn


class HybridCNNTransformer(nn.Module):
    """Hybrid CNN and Transformer scaffold for 12-lead ECG classification."""

    def __init__(
        self,
        in_leads: int = 12,
        num_classes: int = 20,
        embed_dim: int = 128,
        transformer_layers: int = 2,
        attention_heads: int = 4,
    ) -> None:
        super().__init__()
        self.cnn_stem = nn.Sequential(
            nn.Conv1d(in_leads, 64, kernel_size=9, padding=4),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=2),
            nn.Conv1d(64, embed_dim, kernel_size=7, padding=3),
            nn.BatchNorm1d(embed_dim),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=2),
        )
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=attention_heads,
            dim_feedforward=embed_dim * 4,
            dropout=0.1,
            batch_first=True,
            activation="gelu",
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=transformer_layers)
        self.head = nn.Sequential(
            nn.LayerNorm(embed_dim),
            nn.Linear(embed_dim, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.cnn_stem(x).transpose(1, 2)
        encoded = self.transformer(features)
        pooled = encoded.mean(dim=1)
        return self.head(pooled)
