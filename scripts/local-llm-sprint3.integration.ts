import { createServer } from "node:http";
import { createApp } from "../server/src/app";
import { initializeLlmProvider } from "../server/src/llm/llm-registry";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await initializeLlmProvider();
  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;

  const healthRes = await fetch(`${baseUrl}/ai/health`);
  assert(healthRes.ok, `health expected 200, got ${healthRes.status}`);
  const health = (await healthRes.json()) as { model: string; provider: string; status: string };
  assert(health.provider === "ollama" || health.provider === "mock", `unexpected provider ${health.provider}`);
  assert(typeof health.model === "string" && health.model.length > 0, "model missing");
  assert(typeof health.status === "string", "status missing");

  const modelsRes = await fetch(`${baseUrl}/ai/models`);
  assert(modelsRes.ok, `models expected 200, got ${modelsRes.status}`);
  const modelsBody = (await modelsRes.json()) as {
    connected: boolean;
    installedModels: string[];
    provider: string;
    selectedModel: string;
  };
  assert(modelsBody.provider === "ollama" || modelsBody.provider === "mock", "models provider mismatch");
  assert(Array.isArray(modelsBody.installedModels), "installedModels array missing");
  assert(typeof modelsBody.selectedModel === "string", "selectedModel missing");
  assert(typeof modelsBody.connected === "boolean", "connected flag missing");

  server.close();
  console.log(`Local LLM API checks passed (provider=${health.provider}, status=${health.status}, model=${health.model}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
