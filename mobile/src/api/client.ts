export interface MobileApiClientConfig {
  accessToken?: string;
  baseUrl: string;
}

export class MobileApiClient {
  constructor(private readonly config: MobileApiClientConfig) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.config.accessToken) headers.set("authorization", `Bearer ${this.config.accessToken}`);
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    const response = await fetch(`${this.config.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(`Mobile API request failed: ${response.status}`);
    return (await response.json()) as T;
  }
}
