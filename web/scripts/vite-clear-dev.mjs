/**
 * Start Vite with VITE_CLEAR_ON_BOOT=1 so main.js clears localStorage + sessionStorage on load.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(webRoot, "node_modules", "vite", "bin", "vite.js");
const env = { ...process.env, VITE_CLEAR_ON_BOOT: "1" };

if (!existsSync(viteBin)) {
  console.error("vite not found. Run npm install --prefix web");
  process.exit(1);
}

const child = spawn(process.execPath, [viteBin], {
  cwd: webRoot,
  stdio: "inherit",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
