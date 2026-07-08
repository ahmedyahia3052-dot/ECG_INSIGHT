# Local LLM Setup — ECG Insight Enterprise (Sprint 3)

ECG Insight Clinical AI Copilot runs on a **local Ollama** instance. No OpenAI, Anthropic, Gemini, or cloud LLM SDKs are used for chat.

---

## Architecture

```
┌─────────────────────┐     SSE (existing)      ┌──────────────────────────┐
│  Expo Copilot UI    │ ◄────────────────────── │  POST /api/copilot/chat/ │
│  copilot.tsx        │                         │  stream                  │
└─────────┬───────────┘                         └────────────┬─────────────┘
          │                                                  │
          │ fetch                                            │ executeCopilotChat
          ▼                                                  ▼
┌─────────────────────┐                         ┌──────────────────────────┐
│ streamCopilotMessage│                         │ Clinical AI Core         │
│ services/copilot.ts │                         │ ResponseOrchestrator     │
└─────────────────────┘                         └────────────┬─────────────┘
                                                             │
                                                             ▼
                                                ┌──────────────────────────┐
                                                │ copilot/v3/llm-provider  │
                                                │ (adapter + test mock)    │
                                                └────────────┬─────────────┘
                                                             │
                                                             ▼
                                                ┌──────────────────────────┐
                                                │ ai/services/             │
                                                │   ai-chat.service.ts     │
                                                │  retry · timeout · errors│
                                                └────────────┬─────────────┘
                                                             │
                                                             ▼
                                                ┌──────────────────────────┐
                                                │ ai/providers/            │
                                                │   ollama.provider.ts     │
                                                │  HTTP only (no SDK)      │
                                                └────────────┬─────────────┘
                                                             │
                                                             ▼
                                                ┌──────────────────────────┐
                                                │ Ollama                   │
                                                │ http://localhost:11434   │
                                                └──────────────────────────┘
```

### Module layout (`server/src/llm/`)

| Path | Role |
|------|------|
| `providers/llm-provider.interface.ts` | `ILlmProvider` interface |
| `providers/ollama.provider.ts` | Ollama HTTP client (`/api/chat`, `/api/tags`, `/api/version`) |
| `providers/mock.provider.ts` | Deterministic fallback when Ollama is unavailable |
| `llm-registry.ts` | Startup selection, mock fallback, provider resolution |
| `llm-client.ts` | Retries, logging, Copilot adapter |
| `prompts/system.prompt.ts` | Base clinical system instructions (via Clinical AI Core) |

The copilot module (`server/src/modules/copilot/v3/llm-provider.ts`) remains a thin adapter so existing Clinical AI Core and SSE streaming are unchanged.

---

## Configuration

Set these in `.env.development` or `.env.production`:

```env
OLLAMA_ENABLED=true
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:1b
```

When `OLLAMA_ENABLED=true` or `LLM_PROVIDER=ollama`, Copilot **never** requires `AI_MODEL_API_KEY` or `OPENAI_API_KEY`.

Optional cloud fallback (disabled by default):

```env
LLM_OPENAI_FALLBACK=true
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
```

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | Must be `ollama` (only supported provider) |
| `OLLAMA_BASE_URL` | Ollama server base URL |
| `OLLAMA_MODEL` | Model tag (must be pulled in Ollama) |

For automated tests without Ollama:

```env
COPILOT_LLM_MOCK=true
```

Or run with `NODE_ENV=test` (mock is enabled automatically).

---

## Ollama setup

1. Install [Ollama](https://ollama.com/download).
2. Pull the clinical chat model:

   ```bash
   ollama pull llama3.2:1b
   ```

3. Confirm Ollama is running:

   ```bash
   curl http://localhost:11434/api/tags
   ```

4. Start the ECG Insight API:

   ```bash
   npm run dev:api
   ```

5. Verify LLM health:

   ```bash
   curl http://localhost:3002/api/ai/health
   ```

   Example response:

   ```json
   {
     "status": "ok",
     "provider": "ollama",
     "model": "llama3.2:1b",
     "ollamaVersion": "0.31.1"
   }
   ```

6. List installed models:

   ```bash
   curl http://localhost:3002/api/ai/models
   ```

   Example response:

   ```json
   {
     "provider": "ollama",
     "connected": true,
     "selectedModel": "llama3.2:1b",
     "installedModels": ["llama3.2:1b", "qwen2.5:7b"]
   }
   ```

---

## API flow (chat message)

1. User clicks **Send** in Copilot → `streamCopilotMessage()` → `POST /api/copilot/chat/stream`.
2. Backend stores the user message, runs Clinical AI Core (intent, knowledge injection, context).
3. `ResponseOrchestrator` calls `runLlmWithTools()` → `AiChatService.streamChat()`.
4. `OllamaProvider` streams tokens from `POST /api/chat` with `stream: true`.
5. Each token is written as an SSE `token` event (unchanged contract).
6. On success, assistant message is persisted and SSE `done` is sent.
7. On failure after retries, SSE `error` carries a user-facing message:
   - `Local Medical AI is starting...` — Ollama unreachable
   - `Model is loading...` — model missing or warming up
   - `Model unavailable.` — other failures

---

## Provider capabilities

| Method | Ollama endpoint | Purpose |
|--------|-----------------|---------|
| `generateChat()` | `POST /api/chat` (stream: false) | Non-streaming completion |
| `streamChat()` | `POST /api/chat` (stream: true) | Copilot SSE token stream |
| `analyzeImage()` | `POST /api/chat` with `images[]` | Vision attachments (vision-capable model required) |
| `health()` | `GET /api/tags` | Latency + online check |
| `listModels()` | `GET /api/tags` | Installed model names |

---

## Reliability

- **Retries:** 3 attempts with 500ms / 1s / 2s backoff on transient errors.
- **Timeout:** 120 seconds per Ollama request (`OLLAMA_REQUEST_TIMEOUT_MS`).
- **Graceful degradation:** Errors map to plain-language SSE messages; the API does not crash.
- **Tests:** `COPILOT_LLM_MOCK=true` uses deterministic mock replies (no Ollama required).

---

## Future: multiple models

The `LlmProvider` interface is provider-agnostic. To add another local backend:

1. Implement `LlmProvider` in `providers/<name>.provider.ts`.
2. Extend `LLM_PROVIDER` enum in `server/src/config/env.ts`.
3. Register in `createLlmProvider()`.

Examples for future sprints:

- `LLM_PROVIDER=ollama` + `OLLAMA_MODEL=llava` for vision-heavy workflows
- `LLM_PROVIDER=ollama` + `OLLAMA_MODEL=meditron` for clinical fine-tunes
- Additional local runtimes (llama.cpp server, vLLM) as separate provider classes using the same HTTP-only pattern

Model selection can later be exposed via Copilot settings or `GET /api/ai/models` without changing the Clinical AI Core pipeline.

---

## What was not changed

- Authentication and sessions
- Database schema and Prisma models
- Patient / case / ECG analysis modules
- Copilot SSE event contract (`status`, `token`, `error`, `done`)

Voice transcription no longer calls cloud Whisper; configure a local Whisper model in Ollama in a future sprint.
