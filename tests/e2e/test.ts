import { test as base, expect } from "@playwright/test";
import { assertPlatformReady } from "./utils/qa";

export const test = base.extend({
  page: async ({ page, request }, use) => {
    await assertPlatformReady(request);
    await use(page);
  },
});

export { expect };
