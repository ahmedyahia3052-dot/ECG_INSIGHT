export type ClinicalErrorTone = "error" | "warning" | "info";

export type ClinicalError = {
  code: string;
  message: string;
  recovery?: string;
  retryable: boolean;
  tone: ClinicalErrorTone;
};

export function normalizeClinicalError(error: unknown): ClinicalError {
  if (error instanceof Error) {
    const message = error.message.trim() || "An unexpected error occurred.";
    const offline = /network|fetch|connection|offline/i.test(message);
    const timeout = /timeout|timed out/i.test(message);
    const unavailable = /503|unavailable|backend/i.test(message);
    return {
      code: offline ? "NETWORK_OFFLINE" : timeout ? "REQUEST_TIMEOUT" : unavailable ? "SERVICE_UNAVAILABLE" : "UNKNOWN",
      message: offline
        ? "You appear to be offline. Check your connection and try again."
        : timeout
          ? "The request timed out. Your work is saved — please retry."
          : unavailable
            ? "Clinical AI service is temporarily unavailable."
            : message,
      recovery: offline ? "Reconnect and tap Retry." : "Tap Retry or contact support if this persists.",
      retryable: offline || timeout || unavailable,
      tone: "error",
    };
  }
  return {
    code: "UNKNOWN",
    message: "An unexpected error occurred.",
    recovery: "Please retry.",
    retryable: true,
    tone: "error",
  };
}

export function friendlyUploadError(error: unknown): string {
  return normalizeClinicalError(error).message;
}
