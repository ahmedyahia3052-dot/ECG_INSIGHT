export function mapOllamaErrorToGracefulMessage(error: unknown, statusCode?: number): string {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") return "Model is loading...";
    const message = error.message.toLowerCase();
    if (message.includes("econnrefused") || message.includes("fetch failed") || message.includes("network")) {
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
