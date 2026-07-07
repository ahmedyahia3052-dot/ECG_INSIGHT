import { test as base, expect } from "@playwright/test";

import { assertPlatformReady } from "./utils/qa";
import { createNetworkMonitor } from "./utils/network-stability";
import { destroyBrowserSession, resetBrowserStorage } from "./utils/session-cleanup";

export const test = base.extend({
  isolatedRequest: async ({ playwright }, use) => {
    await assertPlatformReady(playwright.request);
    const context = await playwright.request.newContext();
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },
  page: async ({ page, context, request }, use, testInfo) => {
    await assertPlatformReady(request);
    await context.clearCookies();
    await resetBrowserStorage(page);
    const network = createNetworkMonitor(page);
    await use(page);
    network.assertStable(testInfo);
    await destroyBrowserSession(page, context);
  },
});

export { expect };
