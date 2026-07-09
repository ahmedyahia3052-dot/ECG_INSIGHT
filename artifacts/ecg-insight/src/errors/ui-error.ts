export type UiErrorKind =
  | "network"
  | "validation"
  | "authentication"
  | "authorization"
  | "ai"
  | "payment"
  | "unknown";

export type UiError = {
  kind: UiErrorKind;
  message: string;
  retryable: boolean;
  statusCode?: number;
};

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown error");
}

function classifyKind(message: string, statusCode?: number): UiErrorKind {
  const lower = message.toLowerCase();
  if (statusCode === 401 || lower.includes("unauthorized") || lower.includes("sign in")) return "authentication";
  if (statusCode === 403 || lower.includes("forbidden") || lower.includes("permission")) return "authorization";
  if (statusCode === 402 || lower.includes("payment") || lower.includes("subscription")) return "payment";
  if (lower.includes("validation") || lower.includes("invalid") || statusCode === 422) return "validation";
  if (lower.includes("network") || lower.includes("offline") || lower.includes("timeout") || lower.includes("fetch")) return "network";
  if (lower.includes("ai ") || lower.includes("analyze") || lower.includes("model")) return "ai";
  return "unknown";
}

export function normalizeUiError(error: unknown, statusCode?: number): UiError {
  const message = messageOf(error);
  const kind = classifyKind(message, statusCode);
  return {
    kind,
    message,
    retryable: kind === "network" || kind === "ai" || kind === "unknown",
    statusCode,
  };
}
