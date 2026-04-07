import { test, expect } from "@playwright/test";

/**
 * Web UI: Space/Enter must flush the current typewriter line (see `skipTypeRenderRequest` + `typeLine`).
 * Regression: high CPS used delay 0; keydown never interleaved → skip appeared broken.
 */
test.describe("Typewriter skip (Space)", () => {
  test("skips banner typing and reaches Press Enter prompt", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("hktm_campaign_save");
        localStorage.setItem(
          "hktm_operator_profile",
          JSON.stringify({ regionId: "PAC-RIM", codename: "E2E-OP", schemaVersion: 1 }),
        );
        sessionStorage.removeItem("hktm_terminal_boot_done");
        sessionStorage.removeItem("hktm_splash_done");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/play.html?e2e=1");
    await page.waitForLoadState("domcontentloaded");

    /* Banner box drawing (typewriter) — wait for first frame line, then Space skips each line. */
    await expect(page.locator("#term")).toContainText("┌", { timeout: 120000 });

    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const text = await page.locator("#term").innerText();
      if (text.includes("Press Enter")) break;
      await page.keyboard.press("Space");
      await new Promise((r) => setTimeout(r, 25));
    }

    await expect(page.locator("#term")).toContainText("Press Enter", { timeout: 5000 });
  });
});
