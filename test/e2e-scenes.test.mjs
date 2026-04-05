/**
 * E2e scene-branch tests: "if [action] then [scene] else [scene]"
 *
 * Each test takes two actions and asserts that the resulting scene ids differ as
 * documented in `docs/scenes.md` (Mission 1 — all branches).  Scene lines are
 * captured via `setRuntimeSceneAppender`; `setWaitEnterContinueImpl` / `setWaitChoiceImpl`
 * replace interactive prompts so tests run headlessly.
 */
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import { setWaitEnterContinueImpl, setWaitChoiceImpl } from "../src/ui.mjs";
import { setRuntimeSceneAppender, resetSceneDebugChain } from "../src/debug-scene.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const m1Path = path.join(__dirname, "../missions/m1-ghost-proxy.json");

/**
 * Run `fn` while scene lines are captured.  Returns the captured lines array.
 * @param {() => Promise<void>} fn
 * @returns {Promise<string[]>}
 */
async function capturingScenes(fn) {
  const lines = [];
  setRuntimeSceneAppender((l) => lines.push(l));
  resetSceneDebugChain();
  try {
    await fn();
  } finally {
    setRuntimeSceneAppender(null);
  }
  return lines;
}

function hasScene(scenes, id, type) {
  return scenes.some((l) => l.includes(`[SCENE: ${id}`) && l.includes(`type=${type}`));
}

function loadM1() {
  return JSON.parse(fs.readFileSync(m1Path, "utf8"));
}

beforeEach(() => {
  process.env.NO_ANIM = "1";
});

afterEach(() => {
  delete process.env.HKTM_E2E;
  delete process.env.NO_ANIM;
  setWaitEnterContinueImpl(null);
  setWaitChoiceImpl(null);
});

// ---------------------------------------------------------------------------
// Branch 1: info <known-term> → info-<term> scene
//           info <unknown-term> → info-unknown scene
// ---------------------------------------------------------------------------
test("if action=info chat then scene=info-chat; if action=info <unknown> then scene=info-unknown", async () => {
  setWaitEnterContinueImpl(() => Promise.resolve());

  // Branch A — known term "chat"
  const session1 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-info-a" });
  const scenesA = await capturingScenes(() => session1.execute("info chat"));

  assert.ok(
    hasScene(scenesA, "info-chat", "info"),
    `expected [SCENE: info-chat type=info] for 'info chat'; got:\n${scenesA.join("\n")}`,
  );
  assert.ok(
    !hasScene(scenesA, "info-unknown", "info"),
    `'info chat' must not produce info-unknown scene; got:\n${scenesA.join("\n")}`,
  );

  // Branch B — unknown term
  const session2 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-info-b" });
  const scenesB = await capturingScenes(() => session2.execute("info notarealterm"));

  assert.ok(
    hasScene(scenesB, "info-unknown", "info"),
    `expected [SCENE: info-unknown type=info] for unknown term; got:\n${scenesB.join("\n")}`,
  );
  assert.ok(
    !hasScene(scenesB, "info-chat", "info"),
    `unknown term must not produce info-chat scene; got:\n${scenesB.join("\n")}`,
  );
});

// ---------------------------------------------------------------------------
// Branch 2: mail (list) → no paged scene
//           mail read <id> → mail-read-<id> scene
// ---------------------------------------------------------------------------
test("if action=mail then no pager scene; if action=mail read OPS-GR-001 then scene=mail-read-OPS-GR-001", async () => {
  // Branch A — list: showMailList emits no scene line
  const session1 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-mail-a" });
  const scenesA = await capturingScenes(() => session1.execute("mail"));

  assert.ok(
    !scenesA.some((l) => l.includes("mail-read")),
    `'mail' (list) must not emit a mail-read-* scene; got:\n${scenesA.join("\n")}`,
  );

  // Branch B — read: boxPaged emits scene via logScreenStep in non-TTY
  const session2 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-mail-b" });
  const scenesB = await capturingScenes(() => session2.execute("mail read OPS-GR-001"));

  assert.ok(
    hasScene(scenesB, "mail-read-OPS-GR-001", "log"),
    `expected [SCENE: mail-read-OPS-GR-001 type=log] for 'mail read OPS-GR-001'; got:\n${scenesB.join("\n")}`,
  );
});

// ---------------------------------------------------------------------------
// Branch 3: chat → chat-session-open + chat-contract scenes
//           chat close → no new scene
// ---------------------------------------------------------------------------
test("if action=chat then scene=chat-session-open; if action=chat close then no new scene", async () => {
  // Branch A — open ShadowNet IM: clearTerminalScreen("chat-session-open") then boxPaged("chat-contract")
  const session1 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-chat-a" });
  const scenesA = await capturingScenes(() => session1.execute("chat"));

  assert.ok(
    hasScene(scenesA, "chat-session-open", "clear"),
    `expected [SCENE: chat-session-open type=clear] for 'chat'; got:\n${scenesA.join("\n")}`,
  );
  assert.ok(
    hasScene(scenesA, "chat-contract", "log"),
    `expected [SCENE: chat-contract type=log] for 'chat'; got:\n${scenesA.join("\n")}`,
  );

  // Branch B — close/no-op: no session opened, no scene emitted
  const session2 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-chat-b" });
  const scenesB = await capturingScenes(() => session2.execute("chat close"));

  assert.ok(
    !hasScene(scenesB, "chat-session-open", "clear"),
    `'chat close' must not open a chat session; got:\n${scenesB.join("\n")}`,
  );
  assert.ok(
    scenesB.length === 0,
    `'chat close' must not emit any scene lines; got:\n${scenesB.join("\n")}`,
  );
});

// ---------------------------------------------------------------------------
// Branch 4: compose mail when phishing already done → no new scene
//           compose mail when not done → scene compose-mail (type=form)
// ---------------------------------------------------------------------------
test("if phishingBeatDone then compose mail emits no scene; else compose mail emits compose-mail scene", async () => {
  setWaitEnterContinueImpl(() => Promise.resolve());

  // Branch A — phishing already complete: only the "already delivered" path, no form scene
  process.env.HKTM_E2E = "1"; // marks phishingBeatDone=true in createMissionSession
  const session1 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-compose-a" });
  const scenesA = await capturingScenes(() => session1.execute("compose mail"));
  delete process.env.HKTM_E2E;

  assert.ok(
    !hasScene(scenesA, "compose-mail", "form"),
    `when phishing is done, compose mail must not emit compose-mail scene; got:\n${scenesA.join("\n")}`,
  );

  // Branch B — phishing not yet done: wizard runs and first form screen appears
  // Inject choice sequence: subject=2 (correct), body=2 (correct), from=1 (correct)
  const choices = [2, 2, 1];
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(choices[choiceIdx++] ?? 1));

  const session2 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-compose-b" });
  const scenesB = await capturingScenes(() => session2.execute("compose mail"));

  assert.ok(
    hasScene(scenesB, "compose-mail", "form"),
    `when phishing is pending, compose mail must emit compose-mail scene; got:\n${scenesB.join("\n")}`,
  );
});

// ---------------------------------------------------------------------------
// Branch 5: compose mail wizard — wrong subject choice → re-emits compose-mail
//           correct subject choice → advances to compose-mail-body
// ---------------------------------------------------------------------------
test("if wrong subject choice then compose-mail re-emits; else correct choice then compose-mail-body scene", async () => {
  setWaitEnterContinueImpl(() => Promise.resolve());

  // Branch A — wrong first pick (1, correct is 2), then correct to finish
  const choicesA = [1 /* wrong */, 2 /* correct subject */, 2 /* body */, 1 /* from */];
  let idxA = 0;
  setWaitChoiceImpl(() => Promise.resolve(choicesA[idxA++] ?? 1));

  const session1 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-wizard-a" });
  const scenesA = await capturingScenes(() => session1.execute("compose mail"));
  setWaitChoiceImpl(null);

  const composeMailCountA = scenesA.filter((l) => l.includes("[SCENE: compose-mail ")).length;
  assert.ok(
    composeMailCountA >= 2,
    `wrong subject pick must cause compose-mail scene to be re-emitted (≥2 times); got ${composeMailCountA}:\n${scenesA.join("\n")}`,
  );

  // Branch B — correct first pick (2), no retry
  const choicesB = [2 /* correct subject */, 2 /* body */, 1 /* from */];
  let idxB = 0;
  setWaitChoiceImpl(() => Promise.resolve(choicesB[idxB++] ?? 1));

  const session2 = createMissionSession(loadM1(), null, { contactAliasSeed: "scenes-wizard-b" });
  const scenesB = await capturingScenes(() => session2.execute("compose mail"));
  setWaitChoiceImpl(null);

  const composeMailCountB = scenesB.filter((l) => l.includes("[SCENE: compose-mail ")).length;
  assert.ok(
    composeMailCountB === 1,
    `correct subject pick must emit compose-mail exactly once (no retry); got ${composeMailCountB}:\n${scenesB.join("\n")}`,
  );
  assert.ok(
    hasScene(scenesB, "compose-mail-body", "form"),
    `correct subject pick must advance to compose-mail-body scene; got:\n${scenesB.join("\n")}`,
  );
});
