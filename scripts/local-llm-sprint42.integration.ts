import { readFileSync, readdirSync, statSync } from "node:fs";
import { runIntegrationMain } from "./finish-integration";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../server/src/app";
import { initializeLlmProvider } from "../server/src/llm/llm-registry";
import { isOllamaLlmEnabled } from "../server/src/llm/llm-config";
import { LlmClient } from "../server/src/llm/llm-client";
import { probeOllama } from "../server/src/llm/ollama-runtime";

const FORBIDDEN = [
  "Clinical AI requires an LLM API key",
  "Missing AI_MODEL_API_KEY",
  "requires an LLM API key",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function scanForForbiddenApiKeyGuards(dir: string) {
  const hits: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      hits.push(...scanForForbiddenApiKeyGuards(full));
      continue;
    }
    if (!full.endsWith(".ts")) continue;
    const content = readFileSync(full, "utf8");
    for (const phrase of FORBIDDEN) {
      if (content.includes(phrase)) hits.push(`${full}: "${phrase}"`);
    }
  }
  return hits;
}

async function main() {
  delete process.env.AI_MODEL_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.OLLAMA_ENABLED = "true";
  process.env.LLM_PROVIDER = "ollama";
  process.env.COPILOT_LLM_MOCK = "false";

  const hits = [
    ...scanForForbiddenApiKeyGuards("server/src/llm"),
    ...scanForForbiddenApiKeyGuards("server/src/modules/copilot/v3"),
  ];
  assert(hits.length === 0, `Forbidden API key guards found:\n${hits.join("\n")}`);
  assert(isOllamaLlmEnabled(), "Ollama must be enabled for local-only copilot mode");

  const runtime = await probeOllama();
  await initializeLlmProvider();

  const result = await LlmClient.generateStream([
    { content: "You are a clinical tutor.", role: "system" },
    { content: "Teach me ECG from zero", role: "user" },
  ]);

  assert(!/AI_MODEL_API_KEY|requires an LLM API key/i.test(result.content), "Response must not mention missing API keys");
  assert(result.content.trim().length > 0, "Expected non-empty Ollama response");

  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
  });
  if (login.ok) {
    const { accessToken } = (await login.json()) as { accessToken: string };
    const stream = await fetch(`${baseUrl}/copilot/chat/stream`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ contextType: "global", question: "Teach me ECG from zero" }),
    });
    const raw = await stream.text();
    assert(!/AI_MODEL_API_KEY|requires an LLM API key/i.test(raw), `Copilot stream must not require API key:\n${raw.slice(0, 400)}`);
    const errorEvent = raw.match(/event: error[\s\S]*?data: (\{.*?\})/)?.[1];
    if (errorEvent) {
      assert(!/AI_MODEL_API_KEY|requires an LLM API key/i.test(errorEvent), `Copilot SSE error mentions API key: ${errorEvent}`);
    }
  }

  server.close();
  console.log(`Sprint 4.2 passed (ollamaConnected=${runtime.connected}, model=${result.model}, noApiKeyGuards=true).`);
}

runIntegrationMain(main, "Sprint 4.2 passed (ollamaConnected=${runtime.connected}, model=${result.model}, noApiKeyGuards=true)");
