import { env } from "../server/src/config/env.ts";
import { isOllamaLlmEnabled } from "../server/src/llm/llm-config.ts";
import { probeOllama } from "../server/src/llm/ollama-runtime.ts";

async function main() {
  const question = "Teach me ECG from zero.";
  const base = "http://localhost:3002/api";
  const runtime = await probeOllama();

  console.log("=== RUNTIME ENV CHECK ===");
  console.log("OLLAMA_ENABLED", env.OLLAMA_ENABLED);
  console.log("LLM_PROVIDER", env.LLM_PROVIDER);
  console.log("isOllamaLlmEnabled", isOllamaLlmEnabled());
  console.log("AI_MODEL_API_KEY", env.AI_MODEL_API_KEY ? "SET (ignored for Ollama)" : "UNSET (OK for Ollama)");
  console.log("OPENAI_API_KEY", env.OPENAI_API_KEY ? "SET" : "UNSET");
  console.log("COPILOT_LLM_MOCK", process.env.COPILOT_LLM_MOCK ?? "UNSET");
  console.log("ollama_connected", runtime.connected);
  console.log("installed_models", runtime.installedModels.join(", ") || "(none)");
  console.log("selected_model", runtime.selectedModel);

  console.log("\n=== HTTP TEST ===");
  console.log("prompt", JSON.stringify(question));

  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
  });
  const loginBody = await login.text();
  if (!login.ok) {
    console.log("LOGIN_FAILED", login.status, loginBody.slice(0, 300));
    process.exit(1);
  }
  const { accessToken } = JSON.parse(loginBody) as { accessToken: string };

  const started = Date.now();
  const response = await fetch(`${base}/copilot/chat/stream`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ contextType: "global", question }),
  });
  const raw = await response.text();
  const elapsed = Date.now() - started;

  console.log("http_status", response.status);
  console.log("elapsed_ms", elapsed);
  console.log("mentions_api_key_error", /AI_MODEL_API_KEY|requires an LLM API key/i.test(raw));

  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  for (const block of raw.split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    if (!lines.length) continue;
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
    const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();
    if (!dataLine) continue;
    events.push({ data: JSON.parse(dataLine) as Record<string, unknown>, event });
  }

  const tokens = events.filter((item) => item.event === "token").map((item) => String(item.data.token ?? "")).join("");
  const done = events.find((item) => item.event === "done");
  const final =
    (done?.data.message as { content?: string } | undefined)?.content ??
    (events.find((item) => item.event === "conversation")?.data.message as { content?: string } | undefined)?.content ??
    tokens;
  const errorEvent = events.find((item) => item.event === "error");

  console.log("sse_events", events.map((item) => item.event).join(", "));
  console.log("assistant_raw_response", final ? String(final).slice(0, 240) : null);
  console.log("error_event", errorEvent?.data.message ?? null);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
