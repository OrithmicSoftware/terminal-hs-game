import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webIndexPath = path.join(__dirname, "..", "web", "index.html");
const webIndexHtml = fs.readFileSync(webIndexPath, "utf8");

test("web landing page exposes end-user facing copy and outbound links", () => {
  assert.match(webIndexHtml, /Browser story demo — under construction/);
  assert.match(webIndexHtml, /Slip into a neon terminal thriller built for curious players\./);
  assert.match(webIndexHtml, /https:\/\/github\.com\/OrithmicSoftware\/terminal-hs-game/);
  assert.match(webIndexHtml, /https:\/\/github\.com\/sponsors\/OrithmicSoftware/);
  assert.match(webIndexHtml, /class="hktm-landing-pixel-art"/);
});
