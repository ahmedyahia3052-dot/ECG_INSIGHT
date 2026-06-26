import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

const execFileAsync = promisify(execFile);
const databaseUrl = process.env["DATABASE_URL"];
const storagePath = process.env["STORAGE_PATH"] ?? "uploads";
const databaseBackup = process.env["RESTORE_DATABASE_BACKUP"] ?? process.argv[2];
const storageBackup = process.env["RESTORE_STORAGE_BACKUP"] ?? process.argv[3];

async function run(command: string, args: string[]) {
  await execFileAsync(command, args, { env: process.env });
}

async function main() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for restore.");
  if (!databaseBackup) throw new Error("Pass RESTORE_DATABASE_BACKUP or first CLI argument.");

  await run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", databaseUrl, databaseBackup]);
  if (storageBackup) {
    await fs.mkdir(storagePath, { recursive: true });
    await run("tar", ["-xzf", storageBackup, "-C", storagePath]);
  }

  console.log(JSON.stringify({
    databaseBackup,
    ok: true,
    storageBackup: storageBackup ?? null,
    timestamp: new Date().toISOString(),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
