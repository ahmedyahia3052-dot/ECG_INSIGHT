import { createHash } from "node:crypto";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;

export class InferenceCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = MAX_ENTRIES,
  ) {}

  static hashKey(parts: unknown[]): string {
    return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { expiresAt: Date.now() + ttlMs, value });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const inferenceResultCache = new InferenceCache();
