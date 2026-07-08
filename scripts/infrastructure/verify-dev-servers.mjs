/** Verify dev servers remain healthy (for post-sprint persistence checks). */
const FRONTEND = "http://127.0.0.1:8081/";
const API = "http://127.0.0.1:3002/liveness";

async function check() {
  const frontend = await fetch(FRONTEND, { signal: AbortSignal.timeout(8_000) });
  const api = await fetch(API, { signal: AbortSignal.timeout(8_000) });
  const apiJson = await api.json();
  return {
    at: new Date().toISOString(),
    frontend: { ok: frontend.ok, status: frontend.status },
    api: { ok: api.ok && apiJson.ok === true, status: api.status, body: apiJson },
    passed: frontend.status === 200 && api.ok && apiJson.ok === true,
  };
}

const result = await check();
console.log(JSON.stringify(result, null, 2));
process.exit(result.passed ? 0 : 1);
