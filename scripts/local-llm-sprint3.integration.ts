import { createServer } from "node:http";
import { createApp } from "../server/src/app";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;

  const healthRes = await fetch(`${baseUrl}/ai/health`);
  assert(healthRes.ok, `health expected 200, got ${healthRes.status}`);
  const health = (await healthRes.json()) as { latency: number; model: string; online: boolean; provider: string };
  assert(health.provider === "ollama" || health.provider === "mock", `unexpected provider ${health.provider}`);
  assert(typeof health.model === "string" && health.model.length > 0, "model missing");
  assert(typeof health.online === "boolean", "online flag missing");
  assert(typeof health.latency === "number", "latency missing");

  const modelsRes = await fetch(`${baseUrl}/ai/models`);
  assert(modelsRes.ok, `models expected 200, got ${modelsRes.status}`);
  const modelsBody = (await modelsRes.json()) as { models: string[]; online: boolean; provider: string };
  assert(modelsBody.provider === "ollama" || modelsBody.provider === "mock", "models provider mismatch");
  assert(Array.isArray(modelsBody.models), "models array missing");
  assert(typeof modelsBody.online === "boolean", "models online flag missing");

  server.close();
  console.log(`Local LLM API checks passed (ollama online=${health.online}, model=${health.model}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
