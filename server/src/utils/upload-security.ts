import fs from "node:fs";
import { AppError } from "../middleware/error";

type MagicRule = {
  mime: string;
  prefixes: Buffer[];
};

const MAGIC_RULES: MagicRule[] = [
  { mime: "application/pdf", prefixes: [Buffer.from("%PDF")] },
  {
    mime: "image/png",
    prefixes: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  },
  { mime: "image/jpeg", prefixes: [Buffer.from([0xff, 0xd8, 0xff])] },
  { mime: "image/jpg", prefixes: [Buffer.from([0xff, 0xd8, 0xff])] },
];

const textMimeTypes = new Set(["application/json", "text/csv", "text/plain"]);

export function assertUploadContentMatchesMime(filePath: string, mimeType: string) {
  if (textMimeTypes.has(mimeType)) {
    const sample = fs.readFileSync(filePath).subarray(0, 4096);
    if (sample.includes(0)) {
      throw new AppError(400, "Text upload contains binary content.", "INVALID_FILE_CONTENT");
    }
    return;
  }

  const rule = MAGIC_RULES.find((entry) => entry.mime === mimeType);
  if (!rule) {
    throw new AppError(400, "Unsupported file type.", "INVALID_FILE_TYPE");
  }

  const header = fs.readFileSync(filePath).subarray(0, 16);
  const matches = rule.prefixes.some((prefix) => header.subarray(0, prefix.length).equals(prefix));
  if (!matches) {
    throw new AppError(400, "File content does not match declared type.", "INVALID_FILE_CONTENT");
  }
}
