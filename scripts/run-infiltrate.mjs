import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import {
  clearTerminalScreen,
  setWaitDirectionImpl,
  setWaitEnterContinueImpl,
} from "../src/ui.mjs";
import { tone } from "../src/colors.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const missionPath = path.join(root, "missions", "m1-ghost-proxy.json");
const mission = JSON.parse(fs.readFileSync(missionPath, "utf8"));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY === true,
});

const pendingLines = [];
const pendingResolvers = [];

rl.on("line", (line) => {
  const text = String(line ?? "");
  const next = pendingResolvers.shift();
  if (next) {
    next(text);
    return;
  }
  pendingLines.push(text);
});

function waitForLine() {
  return new Promise((resolve) => {
    const queued = pendingLines.shift();
    if (queued !== undefined) {
      resolve(queued);
      return;
    }
    pendingResolvers.push(resolve);
  });
}

const DIRECTION_ALIASES = new Map([
  ["up", "up"],
  ["w", "up"],
  ["down", "down"],
  ["s", "down"],
  ["left", "left"],
  ["a", "left"],
  ["right", "right"],
  ["d", "right"],
]);

setWaitDirectionImpl(async (footerHint, allowedDirections = []) => {
  if (footerHint) console.log(tone(footerHint, "dim"));
  if (process.stdin.isTTY) {
    return await new Promise((resolve) => {
      const finish = (direction) => {
        process.stdin.removeListener("keypress", onKey);
        try {
          process.stdin.setRawMode(false);
        } catch {
          /* ignore */
        }
        resolve(direction);
      };
      const onKey = (str, key) => {
        if (key?.ctrl && key.name === "c") {
          process.exit(1);
        }
        const direction = String(key?.name ?? "").toLowerCase();
        if (!allowedDirections.includes(direction)) return;
        finish(direction);
      };
      try {
        rl.pause();
      } catch {
        /* ignore */
      }
      try {
        process.stdin.setRawMode(true);
      } catch {
        resolve(allowedDirections[0] ?? "right");
        return;
      }
      process.stdin.on("keypress", onKey);
    });
  }
  for (;;) {
    const line = String(await waitForLine()).trim().toLowerCase();
    const direction = DIRECTION_ALIASES.get(line) ?? null;
    if (direction && allowedDirections.includes(direction)) {
      return direction;
    }
    console.log(tone(`Invalid — enter one of: ${allowedDirections.join(", ")}.`, "yellow"));
  }
});

setWaitEnterContinueImpl(async (footerHint = "") => {
  if (footerHint) console.log(tone(footerHint, "dim"));
  await waitForLine();
});

const session = createMissionSession(mission, null, {
  contactAliasSeed: "direct-infiltrate",
});

async function main() {
  try {
    clearTerminalScreen("standalone-infiltrate-launcher", "form");
    console.log("");
    console.log(tone("INFILTRATE MINI-GAME", "bold"));
    console.log(tone("Turn-based stealth routing challenge", "magenta"));
    console.log("");
    console.log(tone("Read the patrol pattern, move with the arrow keys, and ghost through the board.", "dim"));
    console.log("");
    await session.execute("infiltrate");
  } finally {
    setWaitDirectionImpl(null);
    setWaitEnterContinueImpl(null);
    rl.close();
  }
}

await main();
