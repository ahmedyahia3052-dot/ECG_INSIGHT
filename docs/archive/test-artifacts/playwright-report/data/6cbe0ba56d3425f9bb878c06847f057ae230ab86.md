# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-monitor-sidebar-hotfix.spec.ts >> Live Monitor Sidebar Hotfix @live-monitor-sidebar @enterprise >> sidebar controls are full-width and unduplicated at 1366x768
- Location: tests\e2e\live-monitor-sidebar-hotfix.spec.ts:34:9

# Error details

```
Error: ECG case API create failed: {"code":"INTERNAL_SERVER_ERROR","message":"Unexpected server error.","requestId":"d6be0558-e90a-4c68-af43-d05efcda9110"}
```

# Test source

```ts
  205 |       await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible({ timeout: 30_000 });
  206 |       return;
  207 |     } catch (error) {
  208 |       if (attempt >= 4) throw error;
  209 |       if (!(await isPageUsable(page))) throw error;
  210 |       await clearAuthState(page);
  211 |       await expect
  212 |         .poll(async () => page.getByTestId("auth-login-screen").first().isVisible().catch(() => false), {
  213 |           message: "Login screen should become visible after auth reset",
  214 |           timeout: 5_000,
  215 |         })
  216 |         .toBe(true);
  217 |     }
  218 |   }
  219 | }
  220 | 
  221 | async function gotoLogin(page: Page, path: "/login" | "/login?force=1") {
  222 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  223 |     try {
  224 |       await page.goto(path, { timeout: 30_000, waitUntil: "domcontentloaded" });
  225 |       return;
  226 |     } catch (error) {
  227 |       if (attempt >= 2) throw error;
  228 |       await expect
  229 |         .poll(async () => true, { timeout: 1_000 * (attempt + 1) })
  230 |         .toBe(true);
  231 |     }
  232 |   }
  233 | }
  234 | 
  235 | export async function logout(page: Page) {
  236 |   if (!(await isPageUsable(page))) return;
  237 | 
  238 |   const loginScreen = page.getByTestId("auth-login-screen").first();
  239 |   const signInButton = page.getByTestId("auth-sign-in-button").or(page.getByRole("button", { name: /sign in/i })).first();
  240 |   const logoutButton = page.getByRole("button", { name: /log\s?out/i }).first();
  241 | 
  242 |   if (await logoutButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
  243 |     await logoutButton.click();
  244 |     await page.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => undefined);
  245 |   }
  246 | 
  247 |   if (!(await loginScreen.isVisible({ timeout: 5_000 }).catch(() => false))) {
  248 |     await clearAuthState(page);
  249 |   }
  250 | 
  251 |   await expect(loginScreen).toBeVisible({ timeout: 20_000 });
  252 |   await expect(signInButton).toBeVisible({ timeout: 15_000 });
  253 | }
  254 | 
  255 | export async function createPatient(request: APIRequestContext, session: ApiSession | string, suffix = "") {
  256 |   const token = typeof session === "string" ? session : session.token;
  257 |   const csrfToken = typeof session === "string" ? undefined : session.csrfToken;
  258 |   let lastBody = "";
  259 |   for (let attempt = 0; attempt < 4; attempt += 1) {
  260 |     const uniqueSuffix = suffix
  261 |       ? `${suffix}-${attempt}-${Math.random().toString(36).slice(2, 8)}`
  262 |       : `${Date.now()}-${attempt}-${Math.random().toString(36).slice(2, 8)}`;
  263 |     const response = await request.post(`${API_URL}/patients`, {
  264 |       data: {
  265 |         dateOfBirth: "1975-04-12",
  266 |         firstName: `QA${uniqueSuffix.slice(-6)}`,
  267 |         gender: "male",
  268 |         lastName: "Patient",
  269 |         medicalRecordNumber: `QA-MRN-${uniqueSuffix}`,
  270 |       },
  271 |       headers: authHeaders(token, csrfToken),
  272 |     });
  273 |     const body = await response.json();
  274 |     if (response.ok()) {
  275 |       return body.patient as { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
  276 |     }
  277 |     lastBody = JSON.stringify(body);
  278 |     if (response.status() >= 500 || response.status() === 429) {
  279 |       await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
  280 |       continue;
  281 |     }
  282 |     break;
  283 |   }
  284 |   throw new Error(`Patient API create should succeed: ${lastBody}`);
  285 | }
  286 | 
  287 | async function apiPostWithRetry(
  288 |   request: APIRequestContext,
  289 |   url: string,
  290 |   options: { data?: unknown; headers?: Record<string, string> },
  291 |   label: string,
  292 |   retries = 4,
  293 | ) {
  294 |   let lastBody = "";
  295 |   for (let attempt = 0; attempt < retries; attempt += 1) {
  296 |     const response = await request.post(url, options);
  297 |     if (response.ok()) return response;
  298 |     lastBody = await response.text();
  299 |     if (response.status() >= 500 || response.status() === 429) {
  300 |       await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
  301 |       continue;
  302 |     }
  303 |     break;
  304 |   }
> 305 |   throw new Error(`${label} failed: ${lastBody}`);
      |         ^ Error: ECG case API create failed: {"code":"INTERNAL_SERVER_ERROR","message":"Unexpected server error.","requestId":"d6be0558-e90a-4c68-af43-d05efcda9110"}
  306 | }
  307 | 
  308 | export async function createClinicalFixture(request: APIRequestContext, options: { analyze?: boolean; report?: boolean } = {}): Promise<ClinicalFixture & { csrfToken?: string; token: string }> {
  309 |   const session = await apiLogin(request, "doctor");
  310 |   const suffix = Date.now().toString();
  311 |   const patient = await createPatient(request, session, suffix);
  312 |   const caseResponse = await apiPostWithRetry(
  313 |     request,
  314 |     `${API_URL}/cases`,
  315 |     { data: { ecgType: "12-lead QA ECG", patientId: patient.id, priority: "high", status: "pending" }, headers: authHeaders(session.token, session.csrfToken) },
  316 |     "ECG case API create",
  317 |   );
  318 |   const ecgCase = (await caseResponse.json()).case as { caseNumber?: string; id: string };
  319 | 
  320 |   const ecgImage = await createSyntheticEcgPngBuffer();
  321 |   const uploadResponse = await uploadClinicalEcgImage(request, session, {
  322 |     caseId: ecgCase.id,
  323 |     fileName: `qa-${suffix}-50mm-20mm-ecg.png`,
  324 |     image: ecgImage,
  325 |     patientId: patient.id,
  326 |     source: "playwright",
  327 |   });
  328 |   expect(uploadResponse.ok(), "ECG upload API should succeed").toBeTruthy();
  329 |   const file = (await uploadResponse.json()).file as { id: string };
  330 | 
  331 |   if (options.analyze) {
  332 |     const analyzeResponse = await request.post(`${API_URL}/ecg/analyze`, {
  333 |       data: { caseId: ecgCase.id, ecgFileId: file.id },
  334 |       headers: authHeaders(session.token, session.csrfToken),
  335 |     });
  336 |     expect(analyzeResponse.ok(), `ECG image analysis API should succeed: ${await analyzeResponse.text()}`).toBeTruthy();
  337 |   }
  338 | 
  339 |   let reportId: string | undefined;
  340 |   if (options.report) {
  341 |     const reportResponse = await apiPostWithRetry(
  342 |       request,
  343 |       `${API_URL}/reports/cases/${ecgCase.id}/generate`,
  344 |       { headers: authHeaders(session.token, session.csrfToken) },
  345 |       "Report generation API",
  346 |     );
  347 |     reportId = (await reportResponse.json()).report.id;
  348 |   }
  349 | 
  350 |   return {
  351 |     caseId: ecgCase.id,
  352 |     caseNumber: ecgCase.caseNumber,
  353 |     csrfToken: session.csrfToken,
  354 |     ecgFileId: file.id,
  355 |     medicalRecordNumber: patient.medicalRecordNumber,
  356 |     patientId: patient.id,
  357 |     patientName: `${patient.firstName} ${patient.lastName}`,
  358 |     reportId,
  359 |     token: session.token,
  360 |   };
  361 | }
  362 | 
  363 | export async function attachA11yScan(page: Page, testInfo: TestInfo, scopeName: string) {
  364 |   const results = await new AxeBuilder({ page })
  365 |     .disableRules(["color-contrast"])
  366 |     .analyze();
  367 |   await testInfo.attach(`${scopeName}-axe-results`, {
  368 |     body: JSON.stringify(results.violations, null, 2),
  369 |     contentType: "application/json",
  370 |   });
  371 |   expect(results.violations, `${scopeName} should not have critical accessibility violations`).not.toEqual(
  372 |     expect.arrayContaining([expect.objectContaining({ impact: "critical" })]),
  373 |   );
  374 | }
  375 | 
  376 | export async function expectPageReady(page: Page, heading: RegExp | string) {
  377 |   await expect(page.getByText(heading).first()).toBeVisible({ timeout: 45_000 });
  378 |   await expect(page.locator("body")).toBeVisible();
  379 | }
  380 | 
  381 | export async function navigate(page: Page, path: string, heading: RegExp | string) {
  382 |   for (let attempt = 0; attempt < 3; attempt += 1) {
  383 |     const shellLabel = shellNavigationLabel(path);
  384 |     if (shellLabel && attempt === 0) {
  385 |       const button = page.getByRole("button", { name: `Open ${shellLabel}` }).first();
  386 |       if (await button.isVisible().catch(() => false)) {
  387 |         await button.click();
  388 |       } else {
  389 |         await page.goto(path);
  390 |       }
  391 |     } else {
  392 |       await page.goto(path);
  393 |     }
  394 |     try {
  395 |       await expectPageReady(page, heading);
  396 |       return;
  397 |     } catch (error) {
  398 |       if (attempt >= 2) throw error;
  399 |       await expect
  400 |         .poll(async () => true, { timeout: 1_500 * (attempt + 1) })
  401 |         .toBe(true);
  402 |     }
  403 |   }
  404 | }
  405 | 
```