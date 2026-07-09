/** Unified API error contract — mirrors server ApiErrorBody + HTTP status mapping. */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  code: ApiErrorCode | string;
  errors?: unknown;
  message: string;
  requestId?: string;
  success: false;
};

export const HTTP_ERROR_CONTRACTS = {
  401: { code: "UNAUTHORIZED" as const, message: "Authentication required." },
  403: { code: "FORBIDDEN" as const, message: "You do not have permission to perform this action." },
  404: { code: "NOT_FOUND" as const, message: "The requested resource was not found." },
  409: { code: "CONFLICT" as const, message: "The request conflicts with the current resource state." },
  422: { code: "VALIDATION_ERROR" as const, message: "The request payload failed validation." },
  429: { code: "RATE_LIMITED" as const, message: "Too many requests. Retry after cooldown." },
  500: { code: "INTERNAL_ERROR" as const, message: "An unexpected server error occurred." },
} as const;

export type HttpErrorStatus = keyof typeof HTTP_ERROR_CONTRACTS;

export function errorBodyForStatus(status: HttpErrorStatus, message?: string, requestId?: string): ApiErrorBody {
  const contract = HTTP_ERROR_CONTRACTS[status];
  return {
    code: contract.code,
    message: message ?? contract.message,
    requestId,
    success: false,
  };
}
