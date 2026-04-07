import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webIndexPath = path.join(__dirname, "..", "web", "index.html");
const webIndexHtml = fs.readFileSync(webIndexPath, "utf8");

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
  assert.match(webIndexHtml, /event\.target instanceof Element \? event\.target\.closest\('a\[href\]'\) : null/);
  assert.match(webIndexHtml, /url\.origin !== window\.location\.origin \|\| url\.pathname !== window\.location\.pathname/);
  assert.match(webIndexHtml, /document\.querySelector\('\.hktm-site-header'\)/);
  assert.match(webIndexHtml, /window\.history\.replaceState\(null, undefined, url\.hash\)/);
});
