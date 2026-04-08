import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webIndexPath = path.join(__dirname, "..", "web", "index.html");
const webIndexHtml = fs.readFileSync(webIndexPath, "utf8");
const playHtmlPath = path.join(__dirname, "..", "web", "play.html");
const playHtmlSource = fs.readFileSync(playHtmlPath, "utf8");
const campaignBrowserPath = path.join(__dirname, "..", "web", "campaign-browser.mjs");
const campaignBrowserSource = fs.readFileSync(campaignBrowserPath, "utf8");
const introFlowPath = path.join(__dirname, "..", "web", "intro-flow.mjs");
const introFlowSource = fs.readFileSync(introFlowPath, "utf8");
const webMainPath = path.join(__dirname, "..", "web", "main.js");
const webMainSource = fs.readFileSync(webMainPath, "utf8");

test("web landing page presents game-focused copy and stylized HUD details", () => {
  assert.match(webIndexHtml, /Live operator dossier \/\/ fiction-first terminal run/);
  assert.match(webIndexHtml, /Hack the grid\. Dodge the trace\. Decide how the mission ends\./);
  assert.match(webIndexHtml, /Boot the uplink/);
  assert.match(webIndexHtml, /Inspect the mission board/);
  assert.match(webIndexHtml, /Operator HUD/);
  assert.match(webIndexHtml, /<span>HP<\/span>\s*<strong>92\/100<\/strong>/);
  assert.match(webIndexHtml, /class="hktm-landing-pixel-art hktm-landing-pixel-art--wide"/);
});

test("web landing page keeps custom same-page navigation animation with sticky-header offset", () => {
  assert.match(webIndexHtml, /function animateScrollTo\(targetY, durationMs\)/);
  assert.match(webIndexHtml, /const MIN_SCROLL_DURATION_MS = 220;/);
  assert.match(webIndexHtml, /const MAX_SCROLL_DURATION_MS = 760;/);
  assert.match(webIndexHtml, /const SCROLL_DURATION_FACTOR = 0.5;/);
  assert.match(webIndexHtml, /const eased = 1 - Math\.pow\(1 - t, 3\);/);
  assert.match(webIndexHtml, /event\.target instanceof Element \? event\.target\.closest\('a\[href\]'\) : null/);
  assert.match(webIndexHtml, /url\.origin !== window\.location\.origin \|\| url\.pathname !== window\.location\.pathname/);
  assert.match(webIndexHtml, /document\.querySelector\('\.hktm-site-header'\)/);
  assert.match(webIndexHtml, /window\.history\.replaceState\(null, '', url\.hash\)/);
});

test("web landing page glitch script is conflict-free and still drives overlay opacity", () => {
  assert.doesNotMatch(webIndexHtml, /^(<<<<<<<|=======|>>>>>>>)\s/m);
  assert.match(webIndexHtml, /function fireGlitch\(\)/);
  assert.match(webIndexHtml, /ov\.style\.opacity\s*=\s*String\(fr\.oo\);/);
  assert.doesNotMatch(webIndexHtml, /id="hktm-disp-glitch-test"/);
  assert.match(webIndexHtml, /id="hktm-header-glitch-btn"/);
});

test("web landing page does not expose minigame section or launch links", () => {
  assert.doesNotMatch(webIndexHtml, /id="hktm-s-minigames"/);
  assert.doesNotMatch(webIndexHtml, /href="\.\/play\?minigame=/);
  assert.doesNotMatch(webIndexHtml, /data-hktm-minigame-launch=/);
  assert.doesNotMatch(webIndexHtml, /hktm-s-minigames.*Minigames/s);
});

test("browser campaign fast-launch flow is disabled (getRequestedMiniGame returns null)", () => {
  assert.match(campaignBrowserSource, /const requestedMiniGame = getRequestedMiniGame\(\)/);
  assert.match(campaignBrowserSource, /if \(!fastLaunch\) \{/);
  assert.match(campaignBrowserSource, /__HKTM_RUN_COMMAND/);
  assert.match(webMainSource, /await globalThis\.__HKTM_RUN_COMMAND\?\.\(requestedMiniGame\);/);
  // Verify getRequestedMiniGame is a stub that always returns null
  assert.match(introFlowSource, /export function getRequestedMiniGame\(\) \{\s*return null;\s*\}/);
});

test("play splash keeps progression controls disabled", () => {
  assert.match(playHtmlSource, /id="hktm-splash-start-hint"[^>]*hidden/);
  assert.match(playHtmlSource, /data-hktm-splash-skip hidden/);
  assert.match(introFlowSource, /if \(hint\) hint\.hidden = true;/);
  assert.match(introFlowSource, /if \(skip instanceof HTMLElement\) skip\.hidden = true;/);
  assert.match(introFlowSource, /return new Promise\(\(\) => \{\}\);/);
  assert.doesNotMatch(introFlowSource, /document\.addEventListener\("keydown", onKeyDown, true\)/);
});
