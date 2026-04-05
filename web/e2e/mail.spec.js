import { test, expect } from "@playwright/test";
import { bootBrowserCampaignToPrompt } from "./boot-helpers.mjs";

test.describe("Mission mail (m1)", () => {
  test("mail lists OPS-GR thread id", async ({ page }) => {
    await bootBrowserCampaignToPrompt(page);
    const cmd = page.locator("input#cmd");

    /* Bare `mail` starts compose before the spear-phish beat; list explicitly (Node parity uses HKTM_E2E=1 so bare `mail` lists). */
    await cmd.fill("mail list");
    await page.keyboard.press("Enter");
    await expect(page.locator("#term")).toContainText("OPS-GR-001", { timeout: 60000 });
  });
});
