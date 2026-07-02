import { createServer } from "node:http";
import { createApp } from "../server/src/app";
import { initializeLlmProvider } from "../server/src/llm/llm-registry";
import { LlmClient } from "../server/src/llm/llm-client";
import { probeOllama } from "../server/src/llm/ollama-runtime";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const runtime = await probeOllama();
  console.log("Detected models:", runtime.installedModels);
  console.log("Configured model:", process.env.OLLAMA_MODEL ?? "llama3.2:1b");
  console.log("Selected model:", runtime.selectedModel);
  assert(runtime.installedModels.length > 0 || !runtime.connected, "Expected installed models when Ollama is connected");

  await initializeLlmProvider();

  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;

  const healthRes = await fetch(`${baseUrl}/ai/health`);
  assert(healthRes.ok, `health expected 200, got ${healthRes.status}`);
  const health = (await healthRes.json()) as { model: string; ollamaVersion?: string | null; provider: string; status: string };
  assert(typeof health.status === "string", "health status missing");
  assert(typeof health.model === "string" && health.model.length > 0, "health model missing");
  assert(health.provider === "ollama" || health.provider === "mock", `unexpected provider ${health.provider}`);

  const modelsRes = await fetch(`${baseUrl}/ai/models`);
  assert(modelsRes.ok, `models expected 200, got ${modelsRes.status}`);
  const modelsBody = (await modelsRes.json()) as {
    connected: boolean;
    installedModels: string[];
    provider: string;
    selectedModel: string;
  };
  assert(Array.isArray(modelsBody.installedModels), "installedModels missing");
  assert(typeof modelsBody.selectedModel === "string", "selectedModel missing");
  assert(typeof modelsBody.connected === "boolean", "connected flag missing");

  if (runtime.connected) {
    const result = await LlmClient.generateStream([
      { content: "You are a clinical tutor.", role: "system" },
      { content: "Teach me ECG from zero", role: "user" },
    ]);
    assert(result.content.trim().length > 0, "Ollama returned empty response for ECG tutor prompt");
    assert(result.model.length > 0, "Ollama response missing model name");
    console.log(`Ollama ECG tutor response (${result.model}): ${result.content.replace(/\s+/g, " ").slice(0, 160)}...`);
  } else {
    console.log("Ollama offline — skipped live chat verification.");
  }

  server.close();
  console.log(`Sprint 4.1 Ollama runtime checks passed (connected=${runtime.connected}, selectedModel=${modelsBody.selectedModel}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
