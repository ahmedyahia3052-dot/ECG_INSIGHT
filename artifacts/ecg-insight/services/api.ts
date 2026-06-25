import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { requiredApiUrl } from "./env";

export const API_URL = requiredApiUrl();
export const API_ROOT_URL = API_URL.replace(/\/api$/i, "");
const API_TIMEOUT_MS = 15_000;

type AuthRefreshPayload = {
  accessToken: string;
};

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
  accessToken?: string | null;
};

let activeAccessToken: string | null = null;
let onTokenRefresh: ((accessToken: string) => void) | null = null;
let refreshPromise: Promise<string> | null = null;

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

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

export function setApiAccessToken(accessToken: string | null) {
  activeAccessToken = accessToken;
}

export function setApiTokenRefreshHandler(handler: ((accessToken: string) => void) | null) {
  onTokenRefresh = handler;
}

function isAuthEndpoint(url?: string) {
  return !!url && /^\/?auth\/(login|register|phone|oauth|refresh)/.test(url.replace(API_URL, "").replace(/^\/+/, ""));
}

function shouldRefresh(error: AxiosError) {
  const config = error.config as RetryableAxiosRequestConfig | undefined;
  return !!config && !config._retry && !isAuthEndpoint(config.url) && error.response?.status === 401;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<AuthRefreshPayload>("/auth/refresh", undefined, { _retry: true } as RetryableAxiosRequestConfig)
      .then((response) => {
        const nextToken = response.data.accessToken;
        setApiAccessToken(nextToken);
        onTokenRefresh?.(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const requestConfig = config as RetryableAxiosRequestConfig;
  const token = requestConfig.accessToken ?? activeAccessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!shouldRefresh(error)) throw normalizeApiError(error);

    const config = error.config as RetryableAxiosRequestConfig;
    try {
      const nextToken = await refreshAccessToken();
      config._retry = true;
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${nextToken}`,
      };
      return apiClient.request(config);
    } catch (refreshError) {
      throw normalizeApiError(refreshError);
    }
  },
);

function apiErrorMessage(error: AxiosError) {
  if (error.code === AxiosError.ETIMEDOUT || error.code === "ECONNABORTED") {
    return { code: "SERVER_TIMEOUT", message: "Server timeout. Please try again in a moment.", status: 504 };
  }

  if (error.message === "Network Error" || !error.response) {
    return {
      code: "BACKEND_UNAVAILABLE",
      message: "Backend service unavailable. Cannot connect to the ECG Insight server.",
      status: 0,
    };
  }

  const payload = error.response.data;
  const payloadObject =
    payload && typeof payload === "object" ? (payload as { code?: string; message?: string }) : null;

  return {
    code: payloadObject?.code,
    message: payloadObject?.message ?? "Request failed.",
    status: error.response.status,
  };
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const details = apiErrorMessage(error);
    return new ApiError(details.message, details.status, details.code);
  }
  if (error instanceof Error) return new ApiError(error.message, 0, "UNKNOWN_CLIENT_ERROR");
  return new ApiError("Request failed.", 0, "UNKNOWN_CLIENT_ERROR");
}

function responseData<T>(response: AxiosResponse<T>) {
  return response.status === 204 ? undefined as T : response.data;
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

  try {
    const response = await apiClient.request<T>({
      accessToken: options.accessToken,
      data: options.body,
      headers: Object.fromEntries(headers.entries()),
      method: options.method ?? "GET",
      signal: options.signal,
      url: path,
    } as RetryableAxiosRequestConfig);
    return responseData(response);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function checkBackendHealth() {
  try {
    const response = await apiClient.get<{ ok: boolean; service?: string }>(`${API_ROOT_URL}/health`, {
      timeout: 5_000,
    });
    return {
      ok: response.data.ok === true,
      message: response.data.ok === true ? "Backend service online." : "Backend service unavailable.",
      service: response.data.service,
    };
  } catch (error) {
    const normalized = normalizeApiError(error);
    return {
      ok: false,
      message: normalized.message,
      service: "ecg-insight-api",
    };
  }
}
