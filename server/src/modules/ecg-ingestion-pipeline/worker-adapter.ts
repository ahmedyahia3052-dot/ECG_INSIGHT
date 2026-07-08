import type { IngestionWorkerStats } from "./types";

export type IngestionWorkerAdapter = {
  ensureStarted(): void;
  getStats(): IngestionWorkerStats;
  pump(): Promise<void>;
  stopForTests?(): void;
};

let activeAdapter: IngestionWorkerAdapter | null = null;

export function registerIngestionWorkerAdapter(adapter: IngestionWorkerAdapter) {
  activeAdapter = adapter;
}

export function getIngestionWorkerAdapter(): IngestionWorkerAdapter {
  if (!activeAdapter) {
    throw new Error("Ingestion worker adapter is not registered.");
  }
  return activeAdapter;
}

export function ensureIngestionWorkerStarted() {
  getIngestionWorkerAdapter().ensureStarted();
}

export async function triggerIngestionWorkerPump() {
  await getIngestionWorkerAdapter().pump();
}

export function getIngestionWorkerStats(): IngestionWorkerStats {
  return getIngestionWorkerAdapter().getStats();
}

export function stopIngestionWorkerForTests() {
  activeAdapter?.stopForTests?.();
}
