import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import { clearTerminalScreen, setWaitChoiceImpl, setWaitEnterContinueImpl } from "../src/ui.mjs";
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

setWaitChoiceImpl(async (footerHint, max = 3) => {
  if (footerHint) console.log(tone(footerHint, "dim"));
  for (;;) {
    const line = await waitForLine();
    const pick = Number.parseInt(line.trim(), 10);
    if (Number.isInteger(pick) && pick >= 1 && pick <= max) {
      return pick;
    }
    console.log(tone(`Invalid — enter a number from 1 to ${max}.`, "yellow"));
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
    console.log(tone("Read the patrol pattern, pick the safe move, and ghost through the board.", "dim"));
    console.log("");
    await session.execute("infiltrate");
  } finally {
    setWaitChoiceImpl(null);
    setWaitEnterContinueImpl(null);
    rl.close();
  }
}

await main();
