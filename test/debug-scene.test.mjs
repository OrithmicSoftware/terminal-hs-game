/**
 * HKTM_DEBUG modes, scene banner format, and Node vs browser UI shim parity for debug lines.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  isHktmDebug,
  logRuntimeAction,
  resetSceneDebugChain,
  setRuntimeSceneAppender,
  sceneBannerLine,
} from "../src/debug-scene.mjs";
import { resolveRuntimeScenesLogPath, installRuntimeSceneLogFromEnv } from "../src/debug-scene-runtime-log.mjs";
import { clearTerminalScreen, logInfoPauseStep, logScreenStep, stripAnsi } from "../src/ui.mjs";
import {
  clearTerminalScreen as clearTerminalScreenBrowser,
  logScreenStep as logScreenStepBrowser,
  stripAnsi as stripAnsiBrowser,
} from "../src/ui-browser.mjs";

/**
 * @param {string | undefined} val — `undefined` removes HKTM_DEBUG
 * @param {() => void} fn
 */
function withHktmDebug(val, fn) {
  const prev = process.env.HKTM_DEBUG;
  if (val === undefined) {
    delete process.env.HKTM_DEBUG;
  } else {
    process.env.HKTM_DEBUG = val;
  }
  try {
    fn();
  } finally {
    if (prev === undefined) {
      delete process.env.HKTM_DEBUG;
    } else {
      process.env.HKTM_DEBUG = prev;
    }
  }
}

test("isHktmDebug: default on when HKTM_DEBUG is unset or empty", () => {
  withHktmDebug(undefined, () => assert.equal(isHktmDebug(), true));
  withHktmDebug("", () => assert.equal(isHktmDebug(), true));
});

test("isHktmDebug: off for 0 / false / off / no (case-insensitive)", () => {
  for (const v of ["0", "false", "off", "no", "FALSE", "OFF", "NO"]) {
    withHktmDebug(v, () => assert.equal(isHktmDebug(), false, `expected off for HKTM_DEBUG=${JSON.stringify(v)}`));
  }
});

test("isHktmDebug: on for other explicit values", () => {
  for (const v of ["1", "true", "yes", "on", "foo", "TRUE"]) {
    withHktmDebug(v, () => assert.equal(isHktmDebug(), true, `expected on for HKTM_DEBUG=${JSON.stringify(v)}`));
  }
});

test("sceneBannerLine: bracket style with prev chain", () => {
  resetSceneDebugChain();
  assert.equal(sceneBannerLine("boot-intro"), "[SCENE: boot-intro type=clear prev=none]");
  assert.equal(sceneBannerLine("boot-intro", "log"), "[SCENE: boot-intro type=log prev=boot-intro]");
  resetSceneDebugChain();
  assert.equal(sceneBannerLine("boot-intro", "log"), "[SCENE: boot-intro type=log prev=none]");
  assert.equal(sceneBannerLine("boot-intro-after", "pause"), "[SCENE: boot-intro-after type=pause prev=boot-intro]");
  resetSceneDebugChain();
  assert.equal(sceneBannerLine("help-1", "clear"), "[SCENE: help-1 type=clear prev=none]");
  assert.equal(sceneBannerLine("info-usage", "info"), "[SCENE: info-usage type=info prev=help-1]");
  resetSceneDebugChain();
  assert.equal(sceneBannerLine("compose-mail-subject", "form"), "[SCENE: compose-mail-subject type=form prev=none]");
  resetSceneDebugChain();
  assert.equal(sceneBannerLine("info-chat-single-after", "pause"), "[SCENE: info-chat-single-after type=pause prev=none]");
  assert.equal(sceneBannerLine("post-splash", "clear"), "[SCENE: post-splash type=clear prev=none]", "pause does not advance chain");
});

test("sceneBannerLine: pause does not advance prev chain (post-splash follows pager)", () => {
  resetSceneDebugChain();
  sceneBannerLine("info-chat", "log");
  sceneBannerLine("info-chat-after", "pause");
  assert.equal(sceneBannerLine("post-splash", "clear"), "[SCENE: post-splash type=clear prev=info-chat]");
});

test("sceneBannerLine: animate=false and prevOverride", () => {
  resetSceneDebugChain();
  sceneBannerLine("info-chat-exit", "clear");
  assert.equal(
    sceneBannerLine("kernel-loading", "log", { animate: false, prevOverride: "info-chat" }),
    "[SCENE: kernel-loading type=log prev=info-chat animate=false]",
  );
});

function captureIo(fn) {
  const writes = [];
  const logs = [];
  const origWrite = process.stdout.write;
  const origLog = console.log;
  process.stdout.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  console.log = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    fn();
  } finally {
    process.stdout.write = origWrite;
    console.log = origLog;
  }
  return { writes, logs };
}

test("clearTerminalScreen (Node): always writes home clear; scene line only when debug on and name non-empty", () => {
  let cap = captureIo(() =>
    withHktmDebug("0", () => {
      clearTerminalScreen("should-not-print");
    }),
  );
  assert.ok(cap.writes.some((w) => w.includes("\x1b[2J") && w.includes("\x1b[H")));
  assert.equal(cap.logs.length, 0);

  cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      clearTerminalScreen("mission-clear");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[SCENE: mission-clear type=clear prev=none]"));

  cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      clearTerminalScreen("info-probe", "info");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[SCENE: info-probe type=info prev=none]"));

  cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      clearTerminalScreen("compose-mail-subject", "form");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[SCENE: compose-mail-subject type=form prev=none]"));

  cap = captureIo(() =>
    withHktmDebug("1", () => {
      clearTerminalScreen();
      clearTerminalScreen("");
    }),
  );
  assert.equal(cap.logs.length, 0);
});

test("logScreenStep (Node): prints only when debug on; uses type=log", () => {
  let cap = captureIo(() =>
    withHktmDebug("off", () => {
      logScreenStep("boot-intro");
    }),
  );
  assert.equal(cap.logs.length, 0);

  cap = captureIo(() =>
    withHktmDebug(undefined, () => {
      resetSceneDebugChain();
      logScreenStep("operator-survey");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[SCENE: operator-survey type=log prev=none]"));
});

test("clearTerminalScreen (browser shim): matches Node when __HKTM_CLEAR is unset", () => {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "__HKTM_CLEAR");
  const prev = globalThis.__HKTM_CLEAR;
  try {
    delete globalThis.__HKTM_CLEAR;
    let cap = captureIo(() =>
      withHktmDebug("0", () => {
        clearTerminalScreenBrowser("x");
      }),
    );
    assert.ok(cap.writes.some((w) => w.includes("\x1b[2J")));
    assert.equal(cap.logs.length, 0);

    cap = captureIo(() =>
      withHktmDebug("1", () => {
        resetSceneDebugChain();
        clearTerminalScreenBrowser("web-step");
      }),
    );
    assert.equal(cap.logs.length, 1);
    assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[SCENE: web-step type=clear prev=none]"));
  } finally {
    if (had) globalThis.__HKTM_CLEAR = prev;
    else delete globalThis.__HKTM_CLEAR;
  }
});

test("clearTerminalScreen (browser shim): still logs scene when host provides __HKTM_CLEAR", () => {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "__HKTM_CLEAR");
  const prev = globalThis.__HKTM_CLEAR;
  let hostClear = false;
  globalThis.__HKTM_CLEAR = () => {
    hostClear = true;
  };
  try {
    const cap = captureIo(() =>
      withHktmDebug("1", () => {
        resetSceneDebugChain();
        clearTerminalScreenBrowser("after-host-clear");
      }),
    );
    assert.ok(hostClear, "host clear hook should run");
    assert.equal(cap.logs.length, 1);
    assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[SCENE: after-host-clear type=clear prev=none]"));
  } finally {
    if (had) globalThis.__HKTM_CLEAR = prev;
    else delete globalThis.__HKTM_CLEAR;
  }
});

test("logScreenStep (browser shim): matches Node for type=log", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      logScreenStepBrowser("kernel-loading");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[SCENE: kernel-loading type=log prev=none]"));
});

test("logInfoPauseStep: single pause-after line (pager owns type=log)", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      logInfoPauseStep("info-chat");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[SCENE: info-chat-after type=pause prev=none]"));
});

test("logInfoPauseStep: prev follows prior log step", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetSceneDebugChain();
      logScreenStep("info-chat");
      logInfoPauseStep("info-chat");
    }),
  );
  assert.equal(cap.logs.length, 2);
  assert.ok(stripAnsi(cap.logs[1]).includes("[SCENE: info-chat-after type=pause prev=info-chat]"));
});

test("setRuntimeSceneAppender: receives plain scene lines", () => {
  const lines = [];
  setRuntimeSceneAppender((line) => lines.push(line));
  try {
    resetSceneDebugChain();
    sceneBannerLine("a", "clear");
    sceneBannerLine("b", "log");
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes("a type=clear"));
    assert.ok(lines[1].includes("b type=log"));
  } finally {
    setRuntimeSceneAppender(null);
  }
});

test("resolveRuntimeScenesLogPath: HKTM_RUNTIME_SCENES_LOG=1", () => {
  const prevS = process.env.HKTM_RUNTIME_SCENES_LOG;
  const prevL = process.env.HKTM_RUNTIME_STEPS_LOG;
  delete process.env.HKTM_RUNTIME_STEPS_LOG;
  process.env.HKTM_RUNTIME_SCENES_LOG = "1";
  try {
    const p = resolveRuntimeScenesLogPath();
    assert.ok(p && p.endsWith(path.join("logs", "runtime.log")));
  } finally {
    if (prevS === undefined) delete process.env.HKTM_RUNTIME_SCENES_LOG;
    else process.env.HKTM_RUNTIME_SCENES_LOG = prevS;
    if (prevL === undefined) delete process.env.HKTM_RUNTIME_STEPS_LOG;
    else process.env.HKTM_RUNTIME_STEPS_LOG = prevL;
  }
});

test("resolveRuntimeScenesLogPath: legacy HKTM_RUNTIME_STEPS_LOG when SCENES unset", () => {
  const prevS = process.env.HKTM_RUNTIME_SCENES_LOG;
  const prevL = process.env.HKTM_RUNTIME_STEPS_LOG;
  delete process.env.HKTM_RUNTIME_SCENES_LOG;
  process.env.HKTM_RUNTIME_STEPS_LOG = "1";
  try {
    const p = resolveRuntimeScenesLogPath();
    assert.ok(p && p.endsWith(path.join("logs", "runtime.log")));
  } finally {
    if (prevS === undefined) delete process.env.HKTM_RUNTIME_SCENES_LOG;
    else process.env.HKTM_RUNTIME_SCENES_LOG = prevS;
    if (prevL === undefined) delete process.env.HKTM_RUNTIME_STEPS_LOG;
    else process.env.HKTM_RUNTIME_STEPS_LOG = prevL;
  }
});

test("resolveRuntimeScenesLogPath: disabled when HKTM_RUNTIME_SCENES_LOG=0", () => {
  const prev = process.env.HKTM_RUNTIME_SCENES_LOG;
  process.env.HKTM_RUNTIME_SCENES_LOG = "0";
  try {
    assert.equal(resolveRuntimeScenesLogPath(), null);
  } finally {
    if (prev === undefined) delete process.env.HKTM_RUNTIME_SCENES_LOG;
    else process.env.HKTM_RUNTIME_SCENES_LOG = prev;
  }
});

test("installRuntimeSceneLogFromEnv appends to file when path is set", () => {
  const tmp = path.join(os.tmpdir(), `hktm-runtime-scenes-${Date.now()}.log`);
  const prevLog = process.env.HKTM_RUNTIME_SCENES_LOG;
  process.env.HKTM_RUNTIME_SCENES_LOG = tmp;
  installRuntimeSceneLogFromEnv();
  try {
    resetSceneDebugChain();
    sceneBannerLine("fixture-scene", "log");
    logRuntimeAction("shell", "scan");
    const content = fs.readFileSync(tmp, "utf8");
    assert.ok(content.includes("fixture-scene"));
    assert.ok(content.includes("type=log"));
    assert.ok(content.includes("[SCENE:"));
    assert.ok(content.includes("[ACTION: shell] scan"));
  } finally {
    setRuntimeSceneAppender(null);
    if (prevLog === undefined) delete process.env.HKTM_RUNTIME_SCENES_LOG;
    else process.env.HKTM_RUNTIME_SCENES_LOG = prevLog;
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
});
