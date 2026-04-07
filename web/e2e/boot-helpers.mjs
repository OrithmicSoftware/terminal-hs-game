import { expect } from "@playwright/test";

/** Fresh campaign on m1; dismiss banner pager + splash; land on campaign prompt with #cmd visible. */
export async function bootBrowserCampaignToPrompt(page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("hktm_campaign_save");
      localStorage.setItem(
        "hktm_operator_profile",
        JSON.stringify({ regionId: "PAC-RIM", codename: "E2E-OP", schemaVersion: 1 }),
      );
    } catch {
      /* ignore */
    }
  });
  await page.goto("/play.html?e2e=1");
  await page.waitForLoadState("domcontentloaded");

  for (let i = 0; i < 50; i++) {
    const text = await page.locator("#term").innerText();
    if (text.includes("Press Enter")) break;
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 120));
  }
  await expect(page.locator("#term")).toContainText("Press Enter", { timeout: 120000 });
  await page.keyboard.press("Enter");

  await expect(page.locator("#term")).toContainText("BOOT SCREEN", { timeout: 120000 });
  await expect(page.locator("#term")).toContainText("Enter next page", { timeout: 120000 });
  await page.keyboard.press("Enter");

  await expect(page.locator("#term")).toContainText("Current operation", { timeout: 120000 });
  await page.locator("input#cmd").waitFor({ state: "visible", timeout: 120000 });
}
