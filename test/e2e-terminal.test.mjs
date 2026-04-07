/**
 * Parity with `web/e2e/*.spec.js` (Playwright): same engine paths, no browser/DOM.
 * `HKTM_E2E=1` skips scripted spear-phish in CI (see `isCiE2E()` in `src/engine.mjs`).
 * Browser `?e2e=1` shortens animations only; spear-phish runs unless you use `HKTM_E2E` in Node.
 */
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import { setRuntimeSceneAppender } from "../src/debug-scene.mjs";
import { setWaitEnterContinueImpl } from "../src/ui.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const m1Path = path.join(__dirname, "../missions/m1-ghost-proxy.json");

function captureConsoleLog(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...args) => {
    lines.push(args.map(String).join(" "));
    orig(...args);
  };
  return {
    lines,
    restore: () => {
      console.log = orig;
    },
  };
}

beforeEach(() => {
  // Keeps spear-phish compose timings snappy in CI / TTY; real play uses slow OUTBOUND LURE when animations on.
  process.env.NO_ANIM = "1";
});

afterEach(() => {
  delete process.env.HKTM_E2E;
  delete process.env.NO_ANIM;
});

test("e2e parity: mail lists OPS-GR thread id (m1)", async () => {
  process.env.HKTM_E2E = "1";
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-mail",
  });
  const cap = captureConsoleLog();
  try {
    await session.execute("mail");
  } finally {
    cap.restore();
  }
  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("OPS-GR-001"),
    `expected OPS-GR-001 in mail output, got:\n${blob.slice(0, 1200)}`,
  );
});

test("e2e parity: scan then probe gw-edge (step-history scenario engine path)", async () => {
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-probe",
  });
  const cap1 = captureConsoleLog();
  try {
    await session.execute("scan");
  } finally {
    cap1.restore();
  }
  const afterScan = cap1.lines.join("\n");
  assert.ok(
    afterScan.includes("Adjacent hosts"),
    `expected scan output; got:\n${afterScan.slice(0, 1200)}`,
  );

  const cap2 = captureConsoleLog();
  try {
    await session.execute("probe gw-edge");
  } finally {
    cap2.restore();
  }
  const afterProbe = cap2.lines.join("\n");
  assert.ok(
    afterProbe.includes("Probe complete"),
    `expected probe output; got:\n${afterProbe.slice(0, 1200)}`,
  );
});

test("e2e parity: HKTM_E2E=1 pre-completes phishing beat for m1 (CI only; browser ?e2e=1 keeps spear-phish)", () => {
  process.env.HKTM_E2E = "1";
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-gate",
  });
  assert.equal(
    session.state.phishingBeatDone,
    true,
    "engine should mark spear-phish beat done under HKTM_E2E so CI skips the scripted lure flow",
  );
});

test("notification coalescing: probe gw-edge produces a single notification line", async () => {
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-notif",
  });

  await session.execute("scan");
  const cap = captureConsoleLog();
  try {
    await session.execute("probe gw-edge");
  } finally {
    cap.restore();
  }
  const blob = cap.lines.join("\n");
  const notifMatches = blob.match(/new message/gi) || [];
  assert.equal(
    notifMatches.length,
    1,
    `expected exactly 1 notification line after probe gw-edge, got ${notifMatches.length}:\n${blob.slice(0, 2000)}`,
  );
});

test("no Teaching score in compose-mail output", async () => {
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  setWaitEnterContinueImpl(() => Promise.resolve());
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-score",
    composeMailReadyCheckpoint: true,
  });
  const cap = captureConsoleLog();
  try {
    await session.execute("mail");
  } finally {
    cap.restore();
    setWaitEnterContinueImpl(null);
  }
  const blob = cap.lines.join("\n");
  assert.ok(
    !blob.includes("Teaching score"),
    `"Teaching score" should not appear in compose output:\n${blob.slice(0, 2000)}`,
  );
});

test("post-harvest: ShadowNet IM notification after harvest", async () => {
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  setWaitEnterContinueImpl(() => Promise.resolve());
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-harvest",
    composeMailReadyCheckpoint: true,
  });
  const cap = captureConsoleLog();
  try {
    await session.execute("mail");
  } finally {
    cap.restore();
    setWaitEnterContinueImpl(null);
  }
  const blob = cap.lines.join("\n");
  assert.ok(blob.includes("[HARVEST]"), `expected harvest line in output:\n${blob.slice(0, 2000)}`);
  assert.ok(
    !blob.includes("First task complete"),
    `expected "First task complete" to be removed from post-harvest:\n${blob.slice(0, 2000)}`,
  );
  const notifIdx = blob.indexOf("New message");
  const harvestIdx = blob.indexOf("[HARVEST]");
  const missionDoneIdx = blob.indexOf("Mission complete");
  assert.ok(notifIdx >= 0, `expected coalesced IM notification (New message in ShadowNet IM) in output:\n${blob.slice(0, 2000)}`);
  assert.ok(missionDoneIdx >= 0, `expected Mission complete line:\n${blob.slice(0, 2000)}`);
  assert.ok(
    harvestIdx < missionDoneIdx && missionDoneIdx < notifIdx,
    `expected order: harvest → Mission complete → IM notification:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("to open."),
    `expected chat open hint in notification:\n${blob.slice(notifIdx, notifIdx + 200)}`,
  );
  const stripped = blob.replace(/\x1b\[[0-9;?]*m/g, "");
  assert.ok(
    />\s+New message/.test(stripped),
    `expected terminal > prefix before IM notification:\n${blob.slice(0, 2000)}`,
  );
});

test("post-harvest: chat shows contract content and does not clear it away on success", async () => {
  const mission = JSON.parse(fs.readFileSync(m1Path, "utf8"));
  const sceneLines = [];
  setWaitEnterContinueImpl(() => Promise.resolve());
  setRuntimeSceneAppender((line) => sceneLines.push(line));
  const prevDebug = process.env.HKTM_DEBUG;
  process.env.HKTM_DEBUG = "1";
  const session = createMissionSession(mission, null, {
    contactAliasSeed: "e2e-terminal-post-success-chat",
    composeMailReadyCheckpoint: true,
  });
  try {
    await session.execute("compose mail");
    const cap = captureConsoleLog();
    try {
      await session.execute("chat");
    } finally {
      cap.restore();
    }
    const blob = cap.lines.join("\n");
    assert.ok(
      blob.includes("ShadowNet IM"),
      `expected chat title after successful mission:\n${blob.slice(0, 2000)}`,
    );
    assert.ok(
      blob.includes("Contract: «Operation Ghost Proxy»"),
      `expected contract body after successful mission:\n${blob.slice(0, 2000)}`,
    );
    assert.ok(
      blob.includes("Objective:"),
      `expected objective text after successful mission chat:\n${blob.slice(0, 2000)}`,
    );
    assert.equal(
      sceneLines.some((line) => line.includes("chat-session-close")),
      false,
      `chat should remain visible after mission success; unexpected close scene:\n${sceneLines.join("\n")}`,
    );
  } finally {
    setWaitEnterContinueImpl(null);
    setRuntimeSceneAppender(null);
    if (prevDebug === undefined) delete process.env.HKTM_DEBUG;
    else process.env.HKTM_DEBUG = prevDebug;
  }
});
