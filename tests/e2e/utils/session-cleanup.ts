import type { BrowserContext, Page } from "@playwright/test";

export async function resetBrowserStorage(page: Page) {
  if (page.isClosed()) return;
  await page
    .evaluate(async () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Restricted documents during navigation are ignored.
      }
      if ("indexedDB" in globalThis && typeof indexedDB.databases === "function") {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(
            (database) =>
              new Promise<void>((resolve, reject) => {
                if (!database.name) {
                  resolve();
                  return;
                }
                const request = indexedDB.deleteDatabase(database.name);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${database.name}`));
                request.onblocked = () => resolve();
              }),
          ),
        );
      }
    })
    .catch(() => undefined);
}

export async function destroyBrowserSession(page: Page, context: BrowserContext) {
  if (!page.isClosed()) {
    await resetBrowserStorage(page);
  }
  try {
    await context.clearCookies();
  } catch {
    // Context may already be closing.
  }
  if (!page.isClosed()) {
    await page.close().catch(() => undefined);
  }
}
