import { env } from "../config/env";
import { log } from "../utils/logger";

export type OllamaRuntimeState = {
  baseUrl: string;
  connected: boolean;
  installedModels: string[];
  ollamaVersion: string | null;
  selectedModel: string;
};

type OllamaTagsResponse = {
  models?: Array<{ model?: string; name: string }>;
};

type OllamaVersionResponse = {
  version?: string;
};

function normalizeOllamaBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/localhost/g, "127.0.0.1");
  }
}

export function normalizeModelName(value: string) {
  return value.trim().toLowerCase();
}

export function resolveOllamaModel(configuredModel: string, installedModels: string[]): string {
  if (!installedModels.length) return configuredModel;

  const configured = configuredModel.trim();
  if (installedModels.includes(configured)) return configured;

  const normalizedConfigured = normalizeModelName(configured);
  const caseMatch = installedModels.find((model) => normalizeModelName(model) === normalizedConfigured);
  if (caseMatch) return caseMatch;

  const baseName = configured.split(":")[0]?.toLowerCase() ?? normalizedConfigured;
  const prefixMatch = installedModels.find((model) => {
    const lower = model.toLowerCase();
    return lower === baseName || lower.startsWith(`${baseName}:`);
  });
  if (prefixMatch) return prefixMatch;

  log("warn", "Configured Ollama model not found; selecting first installed model.", {
    configuredModel: configured,
    installedModels,
    selectedModel: installedModels[0],
  });
  return installedModels[0]!;
}

export async function probeOllama(baseUrl = env.OLLAMA_BASE_URL): Promise<OllamaRuntimeState> {
  const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);
  const fallback: OllamaRuntimeState = {
    baseUrl: normalizedBaseUrl,
    connected: false,
    installedModels: [],
    ollamaVersion: null,
    selectedModel: env.OLLAMA_MODEL,
  };

  try {
    const [versionRes, tagsRes] = await Promise.all([
      fetch(`${normalizedBaseUrl}/api/version`, { method: "GET", signal: AbortSignal.timeout(15_000) }),
      fetch(`${normalizedBaseUrl}/api/tags`, { method: "GET", signal: AbortSignal.timeout(15_000) }),
    ]);

    if (!versionRes.ok || !tagsRes.ok) {
      log("warn", "Ollama probe failed.", {
        baseUrl: normalizedBaseUrl,
        tagsStatus: tagsRes.status,
        versionStatus: versionRes.status,
      });
      return fallback;
    }

    const versionPayload = (await versionRes.json().catch(() => ({}))) as OllamaVersionResponse;
    const tagsPayload = (await tagsRes.json().catch(() => ({}))) as OllamaTagsResponse;
    const installedModels = (tagsPayload.models ?? [])
      .map((item) => item.name || item.model || "")
      .filter(Boolean);

    const selectedModel = resolveOllamaModel(env.OLLAMA_MODEL, installedModels);

    return {
      baseUrl: normalizedBaseUrl,
      connected: true,
      installedModels,
      ollamaVersion: versionPayload.version ?? null,
      selectedModel,
    };
  } catch (error) {
    log("warn", "Ollama probe unreachable.", {
      baseUrl: normalizedBaseUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

export function logOllamaStartup(state: OllamaRuntimeState) {
  if (state.connected) {
    log("info", "Ollama connected ✔", {
      baseUrl: state.baseUrl,
      ollamaVersion: state.ollamaVersion,
    });
    log("info", "Detected models:", { models: state.installedModels });
    log("info", "Selected model:", {
      configuredModel: env.OLLAMA_MODEL,
      selectedModel: state.selectedModel,
    });
    return;
  }

  log("warn", "Ollama not connected at startup.", {
    baseUrl: state.baseUrl,
    configuredModel: env.OLLAMA_MODEL,
  });
}
