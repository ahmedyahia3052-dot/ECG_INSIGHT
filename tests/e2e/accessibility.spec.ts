import { test } from "@playwright/test";
import { attachA11yScan, navigate, uiLogin } from "./utils/qa";

test.describe("accessibility regression", () => {
  test("core authenticated screens have no critical axe violations @accessibility", async ({ page }, testInfo) => {
    await uiLogin(page, "doctor");
    const screens: Array<[string, string | RegExp]> = [
      ["/dashboard", /Enterprise Clinical Command Center|Dashboard/],
      ["/patients", "Patient Command Search"],
      ["/reports", "Reports Workflow"],
      ["/notifications", "Notification Center"],
      ["/settings", "Workspace Settings"],
      ["/upload-ecg", "Upload ECG"],
    ];

    for (const [path, heading] of screens) {
      await navigate(page, path, heading);
      await attachA11yScan(page, testInfo, path.replace(/\W+/g, "-").replace(/^-|-$/g, ""));
    }
  });
});
