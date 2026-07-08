import { enterpriseLogger } from "../logging/enterprise-logger";

class RequestCancellationRegistry {
  private controllers = new Map<string, AbortController>();

  cancel(key: string) {
    const existing = this.controllers.get(key);
    if (!existing) return false;
    existing.abort();
    this.controllers.delete(key);
    enterpriseLogger.debug("request-cancellation", "Cancelled request", { key });
    return true;
  }

  cancelAll() {
    for (const key of [...this.controllers.keys()]) {
      this.cancel(key);
    }
  }

  createSignal(key: string): AbortSignal {
    this.cancel(key);
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  dispose(key: string) {
    this.controllers.delete(key);
  }

  has(key: string) {
    return this.controllers.has(key);
  }
}

export const requestCancellationRegistry = new RequestCancellationRegistry();

export function createCancellableRequestKey(scope: string, resourceId?: string) {
  return resourceId ? `${scope}:${resourceId}` : scope;
}
