import { spawn } from "node:child_process";
import { openSync } from "node:fs";

const env = {
  ...process.env,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:8081",
  COPILOT_LLM_MOCK:
    process.env.COPILOT_LLM_MOCK === "1" || process.env.COPILOT_LLM_MOCK === "true" ? "true" : (process.env.COPILOT_LLM_MOCK ?? "false"),
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3002/api",
  LLM_OPENAI_FALLBACK: process.env.LLM_OPENAI_FALLBACK ?? "false",
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "ollama",
  NODE_ENV: "development",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  OLLAMA_ENABLED: process.env.OLLAMA_ENABLED ?? "true",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "llama3.2:1b",
  PLAYWRIGHT_E2E_FAST: process.env.PLAYWRIGHT_E2E_FAST ?? "0",
  API_SECURITY_IP_MAX: process.env.API_SECURITY_IP_MAX ?? "180",
  API_SECURITY_USER_MAX: process.env.API_SECURITY_USER_MAX ?? "240",
  API_SECURITY_WINDOW_MS: process.env.API_SECURITY_WINDOW_MS ?? "60000",
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ?? "600",
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000),
  PORT: "3002",
};

const skipPrismaGenerate = process.env["PLAYWRIGHT_SKIP_PRISMA"] === "1";
const apiCommand = skipPrismaGenerate
  ? "npx tsx server/src/index.ts"
  : "npm run prisma:generate && npx tsx server/src/index.ts";

function resolveStdio() {
  const logPath = process.env.STARTUP_LOG_PATH;
  if (!logPath) return "inherit";
  const logFd = openSync(logPath, "a");
  return ["ignore", logFd, logFd];
}

const detached = process.env.E2E_DETACHED === "1";
const child = spawn(apiCommand, {
  detached,
  env,
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
