import { env } from "../../../config/env";
import { LocalStorageProvider } from "./local.provider";
import { S3CompatibleStorageProvider } from "./s3.provider";
import type { StorageProvider } from "../types";

let cachedProvider: StorageProvider | null = null;

export function resolveStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;
  cachedProvider = env.STORAGE_PROVIDER === "s3"
    ? new S3CompatibleStorageProvider()
    : new LocalStorageProvider();
  return cachedProvider;
}

export function resetStorageProviderCache() {
  cachedProvider = null;
}

export { LocalStorageProvider, S3CompatibleStorageProvider };
