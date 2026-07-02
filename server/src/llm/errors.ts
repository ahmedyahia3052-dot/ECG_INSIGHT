export function mapOllamaErrorToGracefulMessage(error: unknown, statusCode?: number): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (detail.includes("model") && (detail.includes("not found") || detail.includes("does not exist"))) {
    return "Model is loading...";
  }
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") return "Model is loading...";
    if (detail.includes("econnrefused") || detail.includes("fetch failed") || detail.includes("network")) {
      return "Local Medical AI is starting...";
    }
  }
  if (statusCode === 404) return "Model is loading...";
  if (statusCode === 502 || statusCode === 503) return "Model is loading...";
  return "Model unavailable.";
}

export function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}
