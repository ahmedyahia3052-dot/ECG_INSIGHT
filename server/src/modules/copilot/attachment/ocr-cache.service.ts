import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { extractClinicalText, type ClinicalOcrResult } from "../../ocr/clinical-ocr.service";

type CacheEntry = {
  expiresAt: number;
  key: string;
  result: ClinicalOcrResult;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const cacheRoot = path.resolve(process.cwd(), "uploads", "ocr-cache");

async function sha256File(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function cacheFilePath(key: string) {
  return path.join(cacheRoot, `${key}.json`);
}

export async function getCachedClinicalOcr(filePath: string, _mimeType: string, _originalName: string): Promise<ClinicalOcrResult | null> {
  try {
    const key = await sha256File(filePath);
    const file = cacheFilePath(key);
    const raw = await fs.readFile(file, "utf8");
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiresAt < Date.now()) {
      await fs.rm(file, { force: true });
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

export async function setCachedClinicalOcr(filePath: string, result: ClinicalOcrResult) {
  const key = await sha256File(filePath);
  await fs.mkdir(cacheRoot, { recursive: true });
  const entry: CacheEntry = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    key,
    result,
  };
  await fs.writeFile(cacheFilePath(key), JSON.stringify(entry));
}

export async function extractClinicalTextCached(filePath: string, mimeType: string, originalName: string) {
  const cached = await getCachedClinicalOcr(filePath, mimeType, originalName);
  if (cached) return { ...cached, warnings: [...cached.warnings, "OCR served from cache"] };
  const result = await extractClinicalText(filePath, mimeType, originalName);
  await setCachedClinicalOcr(filePath, result).catch(() => undefined);
  return result;
}

export async function clearClinicalOcrCacheForTests() {
  await fs.rm(cacheRoot, { force: true, recursive: true });
}
