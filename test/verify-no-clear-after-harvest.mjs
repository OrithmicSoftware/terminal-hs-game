/**
 * Asserts no full-screen clear (\x1b[2J) appears after [HARVEST] and before "New message in ShadowNet IM".
 * Run: node test/verify-no-clear-after-harvest.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import { setWaitEnterContinueImpl } from "../src/ui.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.NO_ANIM = "1";

const m1Path = path.join(__dirname, "../missions/m1-ghost-proxy.json");
const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));

let stdoutBuf = "";
const origWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, cb) => {
  stdoutBuf += typeof chunk === "string" ? chunk : String(chunk);
  return origWrite(chunk, encoding, cb);
};

setWaitEnterContinueImpl(() => Promise.resolve());
const session = createMissionSession(mission, null, {
  contactAliasSeed: "verify-no-clear-after-harvest",
  composeMailReadyCheckpoint: true,
});

await session.execute("mail");
setWaitEnterContinueImpl(null);
process.stdout.write = origWrite;

const idxHarvest = stdoutBuf.indexOf("[HARVEST]");
const idxNew = stdoutBuf.indexOf("New message in ShadowNet IM");
if (idxHarvest === -1) {
  console.error("FAIL: [HARVEST] not found in stdout");
  process.exit(1);
}
if (idxNew === -1) {
  console.error('FAIL: "New message in ShadowNet IM" not found in stdout');
  process.exit(1);
}

const afterHarvest = stdoutBuf.slice(idxHarvest, idxNew);
const CLEAR = "\x1b[2J";
if (afterHarvest.includes(CLEAR)) {
  console.error("FAIL: clear-screen sequence (ESC 2J) appears after [HARVEST] and before New message.");
  console.error("Snippet after harvest:", JSON.stringify(afterHarvest.slice(0, 200)));
  process.exit(1);
}

console.log("OK: no \\x1b[2J between [HARVEST] and New message (sendmail/post-harvest path).");
