import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/error";
import type { StorageHeadResult, StorageObjectRef, StorageProvider, StoragePutInput } from "../types";

function storageRoot() {
  return path.resolve(process.cwd(), env.STORAGE_PATH, "ecg-storage");
}

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;

  private resolveAbsolute(key: string) {
    const root = storageRoot();
    const absolute = path.resolve(root, key);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
      throw new AppError(403, "Invalid storage key.", "INVALID_STORAGE_KEY");
    }
    return absolute;
  }

  async put(input: StoragePutInput): Promise<StorageObjectRef> {
    const absolute = this.resolveAbsolute(input.key);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.copyFile(input.sourcePath, absolute);
    return { absolutePath: absolute, key: input.key, provider: "local" };
  }

  async getPath(key: string): Promise<string> {
    const absolute = this.resolveAbsolute(key);
    try {
      await fs.access(absolute);
    } catch {
      throw new AppError(404, "Storage object not found.", "STORAGE_OBJECT_NOT_FOUND");
    }
    return absolute;
  }

  async delete(key: string): Promise<void> {
    const absolute = this.resolveAbsolute(key);
    await fs.rm(absolute, { force: true });
  }

  async head(key: string): Promise<StorageHeadResult> {
    const absolute = this.resolveAbsolute(key);
    try {
      const stat = await fs.stat(absolute);
      return { exists: true, key, sizeBytes: stat.size };
    } catch {
      return { exists: false, key };
    }
  }
}

export function getLocalStorageRoot() {
  return storageRoot();
}
