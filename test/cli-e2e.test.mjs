/**
 * Spawns the real Node CLI (`game.mjs`) with piped stdin — exercises boot, readline, and quit.
 * Engine-only tests (`e2e-terminal.test.mjs`) do not cover this path.
 *
 * stdin must not send `quit` until after boot finishes; otherwise `quit` runs during boot and
 * closes readline before `main()` reaches the initial `rl.prompt()`.
 *
 * **Boot order (interactive CLI)** must match web: splash → operator survey → faux loading
 * (`src/terminal-boot-cli.mjs`). Piped stdin is non-interactive: no splash/loading UI; defaults apply.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const gameMjs = path.join(repoRoot, "game.mjs");
const terminalBootCli = path.join(repoRoot, "src", "terminal-boot-cli.mjs");

/**
 * @param {NodeJS.ProcessEnv} [extraEnv]
 * @returns {Promise<{ code: number | null, out: string, err: string }>}
 */
function spawnGameUntilQuit(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hktm-cli-e2e-"));
  const savePath = path.join(dir, "campaign-save.json");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [gameMjs], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HKTM_CAMPAIGN_SAVE_PATH: savePath,
        HKTM_SKIP_TERM_BOOT: "1",
        HKTM_E2E: "1",
        ...extraEnv,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    let quitSent = false;

    const cleanup = () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    };

    const sendQuit = () => {
      if (quitSent) return;
      quitSent = true;
      try {
        child.stdin?.write("quit\n");
        child.stdin?.end();
      } catch {
        /* ignore */
      }
    };

    child.stdout?.on("data", (c) => {
      out += c.toString();
      if (out.includes("Current operation:")) {
        sendQuit();
      }
    });
    child.stderr?.on("data", (c) => {
      err += c.toString();
    });
    const failTimer = setTimeout(() => {
      if (!quitSent) {
        child.kill("SIGKILL");
        cleanup();
        reject(new Error("timeout: never saw Current operation: / quit not sent"));
      }
    }, 55_000);

    child.on("error", (e) => {
      clearTimeout(failTimer);
      cleanup();
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(failTimer);
      cleanup();
      resolve({ code, out, err });
    });

    child.stdin?.write("\n");
  });
}

test(
  "cli e2e: piped stdin completes boot, then quit exits 0",
  { timeout: 60_000 },
  async () => {
    const { code, out, err } = await spawnGameUntilQuit();
    assert.equal(code, 0, `expected exit 0, got ${code}. stderr:\n${err.slice(0, 2000)}`);
    const blob = `${out}\n${err}`;
    assert.ok(
      blob.includes("Operation Ghost Proxy") || blob.includes("Ghost Proxy"),
      `expected mission title in output; got stdout (head):\n${out.slice(0, 2500)}`,
    );
    assert.ok(out.includes("Current operation"), "expected operation footer on stdout");
  },
);

test(
  "cli e2e: HKTM_SKIP_CHAT_GATE=1 still completes boot and quit",
  { timeout: 60_000 },
  async () => {
    const { code, out } = await spawnGameUntilQuit({ HKTM_SKIP_CHAT_GATE: "1" });
    assert.equal(code, 0);
    assert.ok(out.includes("Operation Ghost Proxy") || out.includes("Ghost Proxy"));
  },
);

test("cli e2e: terminal-boot-cli source order is splash → operator survey → loading", () => {
  const src = fs.readFileSync(terminalBootCli, "utf8");
  const ixSplash = src.indexOf("await waitForEnterContinue");
  const ixSurvey = src.indexOf("await runTerminalOperatorProfile(");
  const ixLoading = src.indexOf("await runTerminalLoadingSequence(");
  assert.ok(ixSplash !== -1 && ixSurvey !== -1 && ixLoading !== -1, "expected boot markers in terminal-boot-cli.mjs");
  assert.ok(
    ixSplash < ixSurvey && ixSurvey < ixLoading,
    "interactive boot must run splash Enter, then operator profile, then faux loading (parity with web intro-flow)",
  );
  assert.ok(
    src.includes("splash_press_any_key_continue") && src.includes("splash_press_any_key"),
    "splash hint must branch between continue (existing save) and start (new save)",
  );
});
