/**
 * Lightweight viewer readiness timing for performance benchmark harness.
 * @performance
 */
import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Performance viewer readiness @performance", () => {
  test("measure workspace ready time", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId: fixture.caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    await bootstrapAuthenticatedPage(page, "doctor");
    const start = Date.now();
    await openEcgWorkspace(page, fixture.caseId);
    const elapsed = Date.now() - start;
    console.log(`viewer-ready-ms=${elapsed}`);
    expect(elapsed).toBeLessThan(60_000);
  });
});
