import { test, expect } from "@playwright/test";

/**
 * Step history: each full-screen clear saves a snapshot; Alt+PgUp/PgDn browse
 * (see web/main.js). Playwright drives bundled Chromium for stable CI.
 */
test.describe("Web terminal step history", () => {
  test("Alt+PageUp shows scan after probe; Alt+PageDown returns to probe", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    /** Splash: wait for banner, then Enter hides boot and shows #cmd. */
    await expect(page.locator("#term")).toContainText("Press Enter", { timeout: 90000 });
    await page.keyboard.press("Enter");
    const cmd = page.locator("input#cmd");
    await cmd.waitFor({ state: "visible", timeout: 90000 });
    await cmd.fill("scan");
    await page.keyboard.press("Enter");

    const term = page.locator("#term");
    await expect(term).toContainText("Adjacent hosts", { timeout: 60000 });

    await cmd.fill("probe gw-edge");
    await page.keyboard.press("Enter");
    await expect(term).toContainText("Probe complete", { timeout: 60000 });

    await page.keyboard.press("Alt+PageUp");
    await expect(term).toContainText("Adjacent hosts");

    await page.keyboard.press("Alt+PageDown");
    await expect(term).toContainText("Probe complete");
  });
});
