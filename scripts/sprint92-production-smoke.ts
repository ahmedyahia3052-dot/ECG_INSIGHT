/**
 * Sprint 92 — Production integration smoke test.
 * Verifies backend health, auth, DB, storage, AI orchestration, report engine,
 * and frontend connectivity through the dev proxy.
 */
const API = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3002/api").replace(/\/$/, "");
const API_ORIGIN = API.replace(/\/api$/, "");
const FRONTEND = (process.env.CLIENT_ORIGIN ?? "http://localhost:8081").split(",")[0]?.trim() ?? "http://localhost:8081";

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}: ${detail}`);
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text };
  }
  return { body, ok: response.ok, status: response.status, text };
}

async function main() {
  console.log("Sprint 92 production smoke test");
  console.log(`  API:      ${API_ORIGIN}`);
  console.log(`  Frontend: ${FRONTEND}`);
  console.log("");

  // 1. Backend health
  for (const path of ["/liveness", "/health", "/ready", "/readiness"]) {
    const { ok, body, status } = await fetchJson(`${API_ORIGIN}${path}`);
    record(`Backend ${path}`, ok && body.ok === true, ok ? `HTTP ${status}` : `HTTP ${status} ${JSON.stringify(body)}`);
  }

  // 2. Frontend connectivity
  const frontendRoot = await fetch(FRONTEND);
  record("Frontend root", frontendRoot.ok, `HTTP ${frontendRoot.status}`);
  const frontendLogin = await fetch(`${FRONTEND}/login`);
  record("Frontend /login", frontendLogin.ok, `HTTP ${frontendLogin.status}`);

  // 3. Dev proxy (same-origin /api)
  const proxiedLiveness = await fetchJson(`${FRONTEND}/liveness`);
  record("Frontend proxy /liveness", proxiedLiveness.ok && proxiedLiveness.body.ok === true, `HTTP ${proxiedLiveness.status}`);

  // 4. JWT authentication
  const login = await fetchJson(`${API}/auth/login`, {
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  record("JWT login (doctor)", login.ok && typeof login.body.accessToken === "string", `HTTP ${login.status}`);
  const token = String(login.body.accessToken ?? "");
  assert(token, "Missing access token after login");

  const me = await fetchJson(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  record("JWT protected /auth/me", me.ok && (me.body.user as { email?: string } | undefined)?.email === "doctor@ecginsight.com", `HTTP ${me.status}`);

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 5. Protected routes
  for (const path of ["/cases", "/patients", "/reports"]) {
    const res = await fetchJson(`${API}${path}`, { headers: authHeaders });
    record(`Protected ${path}`, res.ok, `HTTP ${res.status}`);
  }

  // 6. Database / Prisma (via readiness)
  const ready = await fetchJson(`${API_ORIGIN}/ready`);
  const dbOk = (ready.body.checks as { database?: { ok?: boolean } } | undefined)?.database?.ok === true;
  record("Database connection", dbOk, dbOk ? "PostgreSQL healthy" : JSON.stringify(ready.body.checks ?? ready.body));

  // 7. Uploads / storage engine
  const storageReady = (ready.body.checks as { storage?: { ok?: boolean; details?: { path?: string } } } | undefined)?.storage;
  record(
    "Uploads folder / storage",
    storageReady?.ok === true,
    storageReady?.details?.path ? `${storageReady.details.path} writable` : JSON.stringify(storageReady ?? {}),
  );
  const storageHealth = await fetchJson(`${API}/ecg-storage/health`, { headers: authHeaders });
  record("ECG storage engine", storageHealth.ok || storageHealth.status === 404, `HTTP ${storageHealth.status}`);

  // 8. AI orchestration
  const aiHealth = await fetchJson(`${API}/ai-orchestration-engine/health`);
  record("AI orchestration engine", aiHealth.ok, `HTTP ${aiHealth.status}`);

  // 9. Report engine
  const reportHealth = await fetchJson(`${API}/medical-report-engine/health`);
  record("Medical report engine", reportHealth.ok, `HTTP ${reportHealth.status}`);

  // 10. AI foundation (Sprint 81)
  const aiFoundation = await fetchJson(`${API}/ai-foundation/health`);
  record("AI foundation", aiFoundation.ok || aiFoundation.status === 404, `HTTP ${aiFoundation.status}`);

  // 11. Proxied login through frontend
  const proxiedLogin = await fetchJson(`${FRONTEND}/api/auth/login`, {
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  record("Proxied login via frontend /api", proxiedLogin.ok, `HTTP ${proxiedLogin.status}`);

  const failed = results.filter((item) => !item.ok);
  console.log("");
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("Failed checks:");
    for (const item of failed) console.error(`  - ${item.name}: ${item.detail}`);
    process.exit(1);
  }
  console.log("Sprint 92 production smoke test: PASS");
}

main().catch((error) => {
  console.error("Sprint 92 production smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
