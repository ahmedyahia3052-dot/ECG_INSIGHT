import { expect, type APIRequestContext, type Page, type Playwright } from "@playwright/test";

import { API_URL, apiLogin, assertPlatformReady, authHeaders, clearAuthState, type ApiSession, users } from "./qa";
import { destroyBrowserSession, resetBrowserStorage } from "./session-cleanup";

export async function createFreshApiContext(playwright: Playwright) {
  await assertPlatformReady(playwright.request);
  return playwright.request.newContext({
    extraHTTPHeaders: { accept: "application/json" },
  });
}

export async function freshApiLogin(playwright: Playwright, role: keyof typeof users = "doctor") {
  const context = await createFreshApiContext(playwright);
  const session = await apiLogin(context, role);
  return { context, session };
}

export async function destroyApiContext(context: APIRequestContext) {
  await context.dispose();
}

export async function validateToken(request: APIRequestContext, token: string) {
  const response = await request.get(`${API_URL}/auth/me`, {
    headers: authHeaders(token),
    timeout: 15_000,
  });
  return response.ok();
}

export async function freshLogout(page: Page) {
  const logoutButton = page.getByRole("button", { name: /log\s?out/i }).first();
  if (await logoutButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => undefined);
  }
  await clearAuthState(page);
  await resetBrowserStorage(page);
  await expect(page.getByTestId("auth-login-screen").first()).toBeVisible({ timeout: 20_000 });
}

export async function freshAuthenticatedPage(page: Page, role: keyof typeof users = "doctor") {
  await clearAuthState(page);
  await resetBrowserStorage(page);
  const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: users[role].email, password: users[role].password, rememberMe: false },
    timeout: 30_000,
  });
  expect(loginResponse.ok(), `Fresh login failed: ${await loginResponse.text()}`).toBeTruthy();
  const payload = (await loginResponse.json()) as { accessToken: string };
  const tokenValid = await validateToken(page.request, payload.accessToken);
  expect(tokenValid, "Fresh login token should validate against /auth/me").toBeTruthy();
  await page.goto("/dashboard", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await expect(
    page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function withFreshApiSession<T>(
  playwright: Playwright,
  role: keyof typeof users,
  run: (session: ApiSession, context: APIRequestContext) => Promise<T>,
) {
  const { context, session } = await freshApiLogin(playwright, role);
  try {
    return await run(session, context);
  } finally {
    await destroyApiContext(context);
  }
}

export async function resetWorkspaceState(page: Page, context: import("@playwright/test").BrowserContext) {
  await destroyBrowserSession(page, context);
}
