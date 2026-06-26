import { spawn } from "node:child_process";

const intervalMs = Number(process.env["BACKUP_INTERVAL_MS"] ?? 24 * 60 * 60 * 1000);

function runBackup() {
  const child = spawn("npx", ["tsx", "scripts/backup-now.ts"], {
    env: process.env,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code === 0) return;
    console.error(`Backup job exited with code ${code ?? "unknown"}.`);
  });
}

runBackup();
setInterval(runBackup, intervalMs);
