/**
 * Delete Node CLI campaign save and start `game.mjs` (fresh terminal session).
 * Browser save is separate (localStorage); this only affects campaign-save.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const savePath = path.join(root, "campaign-save.json");

try {
  if (fs.existsSync(savePath)) {
    fs.unlinkSync(savePath);
    console.error("[hktm] Removed campaign-save.json — starting cold campaign.\n");
  }
} catch (err) {
  console.warn("[hktm] Could not remove campaign-save.json:", err?.message ?? err);
}

const gamePath = path.join(root, "game.mjs");
const child = spawn(process.execPath, [gamePath], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});
child.on("exit", (code) => process.exit(code ?? 0));
