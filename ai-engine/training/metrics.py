import numpy as np


def sigmoid(logits: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-logits))


def binarize(probabilities: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    return (probabilities >= threshold).astype(np.int32)


def multilabel_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> np.ndarray:
    matrices = []
    for label_index in range(y_true.shape[1]):
        true = y_true[:, label_index].astype(bool)
        pred = y_pred[:, label_index].astype(bool)
        tp = int(np.logical_and(true, pred).sum())
        tn = int(np.logical_and(~true, ~pred).sum())
        fp = int(np.logical_and(~true, pred).sum())
        fn = int(np.logical_and(true, ~pred).sum())
        matrices.append([[tn, fp], [fn, tp]])
    return np.asarray(matrices, dtype=np.int64)


def precision_recall_f1(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    matrix = multilabel_confusion_matrix(y_true, y_pred)
    tp = matrix[:, 1, 1].sum()
    fp = matrix[:, 0, 1].sum()
    fn = matrix[:, 1, 0].sum()
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-12)
    return {"precision": float(precision), "recall": float(recall), "f1": float(f1)}


def accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float((y_true == y_pred).mean())


def auroc_binary(y_true: np.ndarray, y_score: np.ndarray) -> float:
    order = np.argsort(y_score)
    ranks = np.empty_like(order, dtype=np.float64)
    ranks[order] = np.arange(1, len(y_score) + 1)
    positives = y_true.astype(bool)
    positive_count = int(positives.sum())
    negative_count = len(y_true) - positive_count
    if positive_count == 0 or negative_count == 0:
        return float("nan")
    rank_sum = ranks[positives].sum()
    return float((rank_sum - positive_count * (positive_count + 1) / 2) / (positive_count * negative_count))


def macro_auroc(y_true: np.ndarray, probabilities: np.ndarray) -> float:
    scores = [auroc_binary(y_true[:, idx], probabilities[:, idx]) for idx in range(y_true.shape[1])]
    valid_scores = [score for score in scores if not np.isnan(score)]
    return float(np.mean(valid_scores)) if valid_scores else float("nan")


def compute_metrics(y_true: np.ndarray, probabilities: np.ndarray, threshold: float = 0.5) -> dict[str, object]:
    y_pred = binarize(probabilities, threshold)
    prf = precision_recall_f1(y_true, y_pred)
    return {
        "accuracy": accuracy(y_true, y_pred),
        "precision": prf["precision"],
        "recall": prf["recall"],
        "f1": prf["f1"],
        "auroc": macro_auroc(y_true, probabilities),
        "confusion_matrix": multilabel_confusion_matrix(y_true, y_pred).tolist(),
    }
