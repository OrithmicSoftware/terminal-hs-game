import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webIndexPath = path.join(__dirname, "..", "web", "index.html");
const webThemePath = path.join(__dirname, "..", "web", "theme.css");
const webIndexHtml = fs.readFileSync(webIndexPath, "utf8");
const webThemeCss = fs.readFileSync(webThemePath, "utf8");

test("roadmap renders a level-map track with staged mission nodes", () => {
  assert.match(webIndexHtml, /class="hktm-level-map"[^>]*aria-label="Campaign level map preview"/);
  assert.match(webIndexHtml, /class="hktm-level-map-track"[^>]*aria-label="Mission progression"/);

  const nodeCount = (webIndexHtml.match(/class="hktm-level-map-node /g) ?? []).length;
  assert.equal(nodeCount, 8);
  assert.match(webIndexHtml, /hktm-level-map-node--next"><span>3<\/span>/);
  assert.match(webIndexHtml, /hktm-level-map-node--locked"><span>8<\/span>/);

  assert.match(webThemeCss, /\.hktm-level-map-track::before/);
  assert.match(webThemeCss, /\.hktm-level-map-node--done:nth-child\(1\)/);
  assert.match(webThemeCss, /\.hktm-level-map-node--locked:nth-child\(8\)/);
});
