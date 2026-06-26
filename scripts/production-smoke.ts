const baseUrl = (process.env["PRODUCTION_BASE_URL"] ?? "http://localhost:3001").replace(/\/$/, "");

const checks = [
  { path: "/health", requiredKeys: ["ok", "service"] },
  { path: "/liveness", requiredKeys: ["ok", "uptimeSeconds"] },
  { path: "/readiness", requiredKeys: ["ok", "checks"] },
  { path: "/api/health", requiredKeys: ["ok", "components"] },
  { path: "/api/health/db", requiredKeys: ["ok", "component"] },
  { path: "/api/health/ai", requiredKeys: ["ok", "component"] },
  { path: "/api/health/storage", requiredKeys: ["ok", "component"] },
] as const;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function checkEndpoint(path: string, requiredKeys: readonly string[]) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "x-request-id": `smoke-${Date.now()}` },
  });
  assert(response.ok, `${path} returned ${response.status}.`);
  const payload = (await response.json()) as Record<string, unknown>;
  for (const key of requiredKeys) {
    assert(key in payload, `${path} response is missing ${key}.`);
  }
  assert(response.headers.get("x-request-id"), `${path} did not return x-request-id.`);
}

async function main() {
  for (const check of checks) {
    await checkEndpoint(check.path, check.requiredKeys);
  }
  console.log(`Production smoke tests passed for ${baseUrl}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
