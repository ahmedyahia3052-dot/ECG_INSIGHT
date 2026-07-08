import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  readLocalWorkspace,
  workspaceStorageKey,
  writeLocalWorkspace,
} from "@/components/ecg/viewer/useEcgViewerPersistence";
import { createWorkspaceState } from "@/components/ecg/viewer/measurementTypes";

const storage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

describe("workspace persistence", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("builds deterministic storage keys", () => {
    expect(workspaceStorageKey("case-1", "patient-1")).toBe("ecg-insight:ecg-monitor-workspace:patient-1:case-1");
  });

  it("round-trips workspace state through async storage", async () => {
    const state = createWorkspaceState({ calipers: [], version: 1 });
    await writeLocalWorkspace("case-1", "patient-1", state);
    const loaded = await readLocalWorkspace("case-1", "patient-1");
    expect(loaded?.version).toBe(state.version);
  });

  it("returns null for corrupt JSON payloads", async () => {
    storage.set(workspaceStorageKey("case-2", "patient-2"), "{not-json");
    await expect(readLocalWorkspace("case-2", "patient-2")).resolves.toBeNull();
  });
});
