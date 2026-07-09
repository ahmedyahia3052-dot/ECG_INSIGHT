import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const frontendDir = path.join(root, "artifacts", "ecg-insight");

const detached = process.env.E2E_DETACHED === "1";
const env = {
  ...process.env,
  ...(detached ? { CI: process.env.CI ?? "1" } : {}),
  EXPO_NO_DOCTOR: "1",
  EXPO_OFFLINE: "1",
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "/api",
  EXPO_PUBLIC_APP_ENV: "development",
  EXPO_PUBLIC_USE_DEV_PROXY: process.env.EXPO_PUBLIC_USE_DEV_PROXY ?? "true",
  NODE_ENV: "development",
};

const mode = process.argv.includes("--mobile") ? "" : "--web ";
function resolveStdio() {
  const logPath = process.env.STARTUP_LOG_PATH;
  if (!logPath) return "inherit";
  const logFd = openSync(logPath, "a");
  return ["ignore", logFd, logFd];
}

const child = spawn(`npx expo start ${mode}--localhost --port 8081`, {
  cwd: frontendDir,
  detached,
  env: { ...env, EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? env.EXPO_PUBLIC_API_URL },
  shell: true,
  stdio: resolveStdio(),
});

if (detached) {
  child.unref();
  process.exit(0);
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
