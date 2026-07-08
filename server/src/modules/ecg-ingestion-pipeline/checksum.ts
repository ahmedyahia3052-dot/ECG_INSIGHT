import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

export async function computeFileSha256(filePath: string): Promise<string> {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error(`Checksum source is not a file: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
