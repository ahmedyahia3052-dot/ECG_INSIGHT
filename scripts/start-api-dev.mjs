import { spawn } from "node:child_process";

const env = {
  ...process.env,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:8081",
  EXPO_PUBLIC_API_URL: "http://localhost:3002/api",
  NODE_ENV: "development",
  PORT: "3002",
};

const child = spawn("npm run prisma:generate && npx tsx server/src/index.ts", {
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
