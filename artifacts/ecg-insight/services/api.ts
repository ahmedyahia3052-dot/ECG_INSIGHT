import { requiredApiUrl } from "./env";

export const API_URL = requiredApiUrl();
export const API_ROOT_URL = API_URL.replace(/\/api$/i, "");

export function apiFileUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;
  return `${API_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!headers.has("content-type") && options.body && !isFormData) {
    headers.set("content-type", "application/json");
  }
  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const payloadObject =
    payload && typeof payload === "object" ? (payload as { code?: string; message?: string }) : null;

  if (!response.ok) {
    const message =
      payloadObject?.message
        ? payloadObject.message
        : "Request failed.";
    const code = payloadObject?.code;
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}
