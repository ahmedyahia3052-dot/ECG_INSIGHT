import { spawn } from "node:child_process";

const env = {
  ...process.env,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:8081",
  COPILOT_LLM_MOCK: process.env.COPILOT_LLM_MOCK === "1" || process.env.COPILOT_LLM_MOCK === "true" ? "1" : (process.env.COPILOT_LLM_MOCK ?? "false"),
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3002/api",
  LLM_OPENAI_FALLBACK: process.env.LLM_OPENAI_FALLBACK ?? "false",
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "ollama",
  NODE_ENV: "development",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  OLLAMA_ENABLED: process.env.OLLAMA_ENABLED ?? "true",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "llama3.2:1b",
  PORT: "3002",
};

const skipPrismaGenerate = process.env["PLAYWRIGHT_SKIP_PRISMA"] === "1";
const apiCommand = skipPrismaGenerate
  ? "npx tsx server/src/index.ts"
  : "npm run prisma:generate && npx tsx server/src/index.ts";

const child = spawn(apiCommand, {
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
