import { test, expect } from "@playwright/test";
import { bootBrowserCampaignToPrompt } from "./boot-helpers.mjs";

/**
 * Step history: each full-screen clear saves a snapshot; Ctrl+arrows / PgUp/PgDn or toolbar
 * (Shift+Pg scrolls the terminal). See web/main.js.
 */
test.describe("Web terminal step history", () => {
  test("PageUp shows scan after probe; PageDown returns; toolbar matches state", async ({ page }) => {
    await bootBrowserCampaignToPrompt(page);
    const cmd = page.locator("input#cmd");
    await cmd.fill("scan");
    await page.keyboard.press("Enter");

    const term = page.locator("#term");
    await expect(term).toContainText("Adjacent hosts", { timeout: 60000 });

    await cmd.fill("probe gw-edge");
    await page.keyboard.press("Enter");
    await expect(term).toContainText("Probe complete", { timeout: 60000 });

    await expect(page.locator("#step-history-prev")).toBeEnabled();
    await expect(page.locator("#step-history-curr")).toBeDisabled();
    await expect(page.locator("#step-history-next")).toBeDisabled();

    await page.keyboard.press("PageUp");
    await expect(term).toContainText("Adjacent hosts");
    await expect(page.locator("#step-history-next")).toBeEnabled();
    await expect(page.locator("#step-history-curr")).toBeEnabled();

    await page.keyboard.press("PageDown");
    await expect(term).toContainText("Probe complete");
    await expect(page.locator("#step-history-curr")).toBeDisabled();

    await page.locator("#step-history-prev").click();
    await expect(term).toContainText("Adjacent hosts");
    await page.locator("#step-history-curr").click();
    await expect(term).toContainText("Probe complete");

    await page.locator("#step-history-prev").click();
    await expect(term).toContainText("Adjacent hosts");
    await page.locator("#step-history-next").click();
    await expect(term).toContainText("Probe complete");
  });
});
