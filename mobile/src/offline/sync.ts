import type { MobileSyncItemDto } from "../dto";

export interface OfflineCacheAdapter {
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface SyncQueueAdapter {
  enqueue(item: Omit<MobileSyncItemDto, "id" | "retryCount" | "status">): Promise<void>;
  list(): Promise<MobileSyncItemDto[]>;
  markCompleted(id: string): Promise<void>;
}
