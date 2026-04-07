import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const runCipherMjs = path.join(repoRoot, "scripts", "run-cipher.mjs");
const runInfiltrateMjs = path.join(repoRoot, "scripts", "run-infiltrate.mjs");

test(
  "npm cipher launcher runs the direct terminal cipher challenge",
  { timeout: 60_000 },
  async () => {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [runCipherMjs], {
        cwd: repoRoot,
        env: {
          ...process.env,
          NO_ANIM: "1",
          HKTM_E2E: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let out = "";
      let err = "";

      child.stdout?.on("data", (chunk) => {
        out += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        err += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, out, err }));

      child.stdin?.end("1\n\n2\n\n2\n\n\n");
    });

    assert.equal(result.code, 0, `expected exit 0, got ${result.code}. err:\n${result.err}`);
    assert.match(result.out, /CIPHER MINI-GAME/);
    assert.doesNotMatch(result.out, /Operation Ghost Proxy/);
    assert.match(result.out, /CIPHER CHALLENGE COMPLETE/);
  },
);

test(
  "npm infiltrate launcher runs the direct stealth-routing challenge",
  { timeout: 60_000 },
  async () => {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [runInfiltrateMjs], {
        cwd: repoRoot,
        env: {
          ...process.env,
          NO_ANIM: "1",
          HKTM_E2E: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let out = "";
      let err = "";

      child.stdout?.on("data", (chunk) => {
        out += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        err += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, out, err }));

      child.stdin?.end(
        "\n" +
        "right\n\n" +
        "right\n\n" +
        "down\n\n" +
        "\n" +
        "\n" +
        "right\n\n" +
        "down\n\n" +
        "right\n\n" +
        "right\n\n" +
        "\n" +
        "\n" +
        "up\n\n" +
        "up\n\n" +
        "down\n\n" +
        "right\n\n" +
        "\n" +
        "\n",
      );
    });

    assert.equal(result.code, 0, `expected exit 0, got ${result.code}. err:\n${result.err}`);
    assert.match(result.out, /INFILTRATE MINI-GAME/);
    assert.doesNotMatch(result.out, /Operation Ghost Proxy/);
    assert.match(result.out, /INFILTRATION ROUTE COMPLETE/);
    assert.match(result.out, /MOVE/);
  },
);
