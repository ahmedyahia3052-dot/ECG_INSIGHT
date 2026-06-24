import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const frontendDir = path.join(root, "artifacts", "ecg-insight");

const env = {
  ...process.env,
  EXPO_NO_DOCTOR: "1",
  EXPO_OFFLINE: "1",
  EXPO_PUBLIC_API_URL: "http://localhost:3002/api",
  EXPO_PUBLIC_APP_ENV: "development",
  NODE_ENV: "development",
};

const mode = process.argv.includes("--mobile") ? "" : "--web ";
const child = spawn(`npx expo start ${mode}--localhost --port 8081`, {
  cwd: frontendDir,
  env,
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
