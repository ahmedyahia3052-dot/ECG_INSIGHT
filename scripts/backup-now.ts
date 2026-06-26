import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

const execFileAsync = promisify(execFile);
const backupDir = process.env["BACKUP_DIR"] ?? "backups";
const storagePath = process.env["STORAGE_PATH"] ?? "uploads";
const databaseUrl = process.env["DATABASE_URL"];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function run(command: string, args: string[]) {
  await execFileAsync(command, args, { env: process.env });
}

async function main() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL backups.");
  await fs.mkdir(backupDir, { recursive: true });
  const stamp = timestamp();
  const dbBackupPath = path.join(backupDir, `postgres-${stamp}.dump`);
  const uploadBackupPath = path.join(backupDir, `uploads-${stamp}.tar.gz`);

  await run("pg_dump", ["--format=custom", "--file", dbBackupPath, databaseUrl]);
  await fs.mkdir(storagePath, { recursive: true });
  await run("tar", ["-czf", uploadBackupPath, "-C", storagePath, "."]);

  console.log(JSON.stringify({
    backupDir,
    databaseBackup: dbBackupPath,
    ok: true,
    storageBackup: uploadBackupPath,
    timestamp: new Date().toISOString(),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
