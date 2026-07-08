/**
 * Sprint 91 — Production stabilization smoke test.
 * Requires backend on PORT 3002 and frontend on 8081.
 */
const API = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3002/api").replace(/\/$/, "");
const FRONTEND = (process.env.CLIENT_ORIGIN ?? "http://localhost:8081").replace(/\/$/, "");

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await fetch(`${API.replace(/\/api$/, "")}/liveness`);
  assert(health.ok, "Backend liveness failed");

  const frontendLogin = await fetch(`${FRONTEND}/login`);
  assert(frontendLogin.ok, "Frontend login page failed");

  const loginRes = await fetch(`${API}/auth/login`, {
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  assert(loginRes.ok, `Login failed: ${loginRes.status}`);
  const login = (await loginRes.json()) as { accessToken?: string; user?: { id: string } };
  assert(login.accessToken, "Missing access token");
  assert(login.user?.id, "Missing user");

  const meRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  assert(meRes.ok, "Protected /auth/me failed");

  const casesRes = await fetch(`${API}/cases`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  assert(casesRes.ok, "Protected /cases failed");

  const patientsRes = await fetch(`${API}/patients`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  assert(patientsRes.ok, "Protected /patients failed");

  const docsRes = await fetch(`${API.replace(/\/api$/, "")}/api/docs`);
  assert(docsRes.ok, "Swagger docs failed");

  const ccmRes = await fetch(`${API}/clinical-case-management/cases/test-case-id`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  assert([404, 200].includes(ccmRes.status), "Clinical case management route unreachable");

  console.log("Sprint 91 stabilization smoke test: PASS");
  console.log(`  Frontend: ${FRONTEND}`);
  console.log(`  Backend:  ${API.replace(/\/api$/, "")}`);
  console.log(`  Swagger:  ${API.replace(/\/api$/, "")}/api/docs`);
}

main().catch((error) => {
  console.error("Sprint 91 stabilization smoke test: FAIL");
  console.error(error);
  process.exit(1);
});
