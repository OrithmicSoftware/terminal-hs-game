import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webIndexPath = path.join(__dirname, "..", "web", "index.html");
const webIndexHtml = fs.readFileSync(webIndexPath, "utf8");
const campaignBrowserPath = path.join(__dirname, "..", "web", "campaign-browser.mjs");
const campaignBrowserSource = fs.readFileSync(campaignBrowserPath, "utf8");
const webMainPath = path.join(__dirname, "..", "web", "main.js");
const webMainSource = fs.readFileSync(webMainPath, "utf8");
const playHtmlPath = path.join(__dirname, "..", "web", "play.html");
const playHtmlSource = fs.readFileSync(playHtmlPath, "utf8");

test("web landing page presents game-focused copy and stylized HUD details", () => {
  assert.match(webIndexHtml, /Live operator dossier \/\/ fiction-first terminal run/);
  assert.match(webIndexHtml, /Hack the grid\. Dodge the trace\. Decide how the mission ends\./);
  assert.match(webIndexHtml, /Boot the uplink/);
  assert.match(webIndexHtml, /Inspect the mission board/);
  assert.match(webIndexHtml, /Operator HUD/);
  assert.match(webIndexHtml, /<span>HP<\/span>\s*<strong>92\/100<\/strong>/);
  assert.match(webIndexHtml, /class="hktm-landing-pixel-art hktm-landing-pixel-art--wide"/);
});

test("web landing page exposes dedicated minigame cards with launch links", () => {
  assert.match(webIndexHtml, /id="hktm-s-minigames"/);
  assert.match(webIndexHtml, /Three fast drills you can launch straight from the site\./);
  assert.match(webIndexHtml, /Hexbreaker/);
  assert.match(webIndexHtml, /Hash Hunt/);
  assert.match(webIndexHtml, /Fixline/);
  assert.match(webIndexHtml, /href="\.\/play\?minigame=cipher"/);
  assert.match(webIndexHtml, /href="\.\/play\?minigame=crack"/);
  assert.match(webIndexHtml, /href="\.\/play\?minigame=patch"/);
  assert.match(webIndexHtml, /data-hktm-minigame-launch="cipher"/);
  assert.match(webIndexHtml, /window\.open\(link\.href, 'hktm-minigame-'/);
});

test("browser campaign supports requested minigame fast-launch flow", () => {
  assert.match(campaignBrowserSource, /const requestedMiniGame = getRequestedMiniGame\(\)/);
  assert.match(campaignBrowserSource, /if \(!fastLaunch\) \{/);
  assert.match(campaignBrowserSource, /MINIGAME UPLINK/);
  assert.match(campaignBrowserSource, /__HKTM_RUN_COMMAND/);
  assert.match(webMainSource, /await globalThis\.__HKTM_RUN_COMMAND\?\.\(requestedMiniGame\);/);
  assert.match(playHtmlSource, /params\.get\("e2e"\) === "1" \|\| params\.get\("minigame"\)/);
});
