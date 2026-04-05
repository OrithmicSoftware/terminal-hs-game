/**
 * HKTM_DEBUG modes, step banner format, and Node vs browser UI shim parity for debug lines.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  isHktmDebug,
  resetStepDebugChain,
  setRuntimeStepAppender,
  stepBannerLine,
} from "../src/debug-step.mjs";
import { resolveRuntimeStepsLogPath, installRuntimeStepLogFromEnv } from "../src/debug-step-runtime-log.mjs";
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

test("stepBannerLine: bracket style with prev chain", () => {
  resetStepDebugChain();
  assert.equal(stepBannerLine("boot-intro"), "[STEP: boot-intro type=clear prev=none]");
  assert.equal(stepBannerLine("boot-intro", "log"), "[STEP: boot-intro type=log prev=boot-intro]");
  resetStepDebugChain();
  assert.equal(stepBannerLine("boot-intro", "log"), "[STEP: boot-intro type=log prev=none]");
  assert.equal(stepBannerLine("boot-intro-after", "pause"), "[STEP: boot-intro-after type=pause prev=boot-intro]");
  resetStepDebugChain();
  assert.equal(stepBannerLine("help-1", "clear"), "[STEP: help-1 type=clear prev=none]");
  assert.equal(stepBannerLine("info-usage", "info"), "[STEP: info-usage type=info prev=help-1]");
  resetStepDebugChain();
  assert.equal(stepBannerLine("info-chat-single-after", "pause"), "[STEP: info-chat-single-after type=pause prev=none]");
  assert.equal(stepBannerLine("post-splash", "clear"), "[STEP: post-splash type=clear prev=none]", "pause does not advance chain");
});

test("stepBannerLine: pause does not advance prev chain (post-splash follows pager)", () => {
  resetStepDebugChain();
  stepBannerLine("info-chat", "log");
  stepBannerLine("info-chat-after", "pause");
  assert.equal(stepBannerLine("post-splash", "clear"), "[STEP: post-splash type=clear prev=info-chat]");
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

test("clearTerminalScreen (Node): always writes home clear; step line only when debug on and name non-empty", () => {
  let cap = captureIo(() =>
    withHktmDebug("0", () => {
      clearTerminalScreen("should-not-print");
    }),
  );
  assert.ok(cap.writes.some((w) => w.includes("\x1b[2J") && w.includes("\x1b[H")));
  assert.equal(cap.logs.length, 0);

  cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetStepDebugChain();
      clearTerminalScreen("mission-clear");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[STEP: mission-clear type=clear prev=none]"));

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
      resetStepDebugChain();
      logScreenStep("operator-survey");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[STEP: operator-survey type=log prev=none]"));
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
        resetStepDebugChain();
        clearTerminalScreenBrowser("web-step");
      }),
    );
    assert.equal(cap.logs.length, 1);
    assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[STEP: web-step type=clear prev=none]"));
  } finally {
    if (had) globalThis.__HKTM_CLEAR = prev;
    else delete globalThis.__HKTM_CLEAR;
  }
});

test("clearTerminalScreen (browser shim): still logs step when host provides __HKTM_CLEAR", () => {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "__HKTM_CLEAR");
  const prev = globalThis.__HKTM_CLEAR;
  let hostClear = false;
  globalThis.__HKTM_CLEAR = () => {
    hostClear = true;
  };
  try {
    const cap = captureIo(() =>
      withHktmDebug("1", () => {
        resetStepDebugChain();
        clearTerminalScreenBrowser("after-host-clear");
      }),
    );
    assert.ok(hostClear, "host clear hook should run");
    assert.equal(cap.logs.length, 1);
    assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[STEP: after-host-clear type=clear prev=none]"));
  } finally {
    if (had) globalThis.__HKTM_CLEAR = prev;
    else delete globalThis.__HKTM_CLEAR;
  }
});

test("logScreenStep (browser shim): matches Node for type=log", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetStepDebugChain();
      logScreenStepBrowser("kernel-loading");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsiBrowser(cap.logs[0]).includes("[STEP: kernel-loading type=log prev=none]"));
});

test("logInfoPauseStep: single pause-after line (pager owns type=log)", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetStepDebugChain();
      logInfoPauseStep("info-chat");
    }),
  );
  assert.equal(cap.logs.length, 1);
  assert.ok(stripAnsi(cap.logs[0]).includes("[STEP: info-chat-after type=pause prev=none]"));
});

test("logInfoPauseStep: prev follows prior log step", () => {
  const cap = captureIo(() =>
    withHktmDebug("1", () => {
      resetStepDebugChain();
      logScreenStep("info-chat");
      logInfoPauseStep("info-chat");
    }),
  );
  assert.equal(cap.logs.length, 2);
  assert.ok(stripAnsi(cap.logs[1]).includes("[STEP: info-chat-after type=pause prev=info-chat]"));
});

test("setRuntimeStepAppender: receives plain step lines", () => {
  const lines = [];
  setRuntimeStepAppender((line) => lines.push(line));
  try {
    resetStepDebugChain();
    stepBannerLine("a", "clear");
    stepBannerLine("b", "log");
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes("a type=clear"));
    assert.ok(lines[1].includes("b type=log"));
  } finally {
    setRuntimeStepAppender(null);
  }
});

test("resolveRuntimeStepsLogPath: HKTM_RUNTIME_STEPS_LOG=1", () => {
  const prev = process.env.HKTM_RUNTIME_STEPS_LOG;
  process.env.HKTM_RUNTIME_STEPS_LOG = "1";
  try {
    const p = resolveRuntimeStepsLogPath();
    assert.ok(p && p.endsWith("runtime_steps.log"));
  } finally {
    if (prev === undefined) delete process.env.HKTM_RUNTIME_STEPS_LOG;
    else process.env.HKTM_RUNTIME_STEPS_LOG = prev;
  }
});

test("resolveRuntimeStepsLogPath: disabled when HKTM_RUNTIME_STEPS_LOG=0", () => {
  const prev = process.env.HKTM_RUNTIME_STEPS_LOG;
  process.env.HKTM_RUNTIME_STEPS_LOG = "0";
  try {
    assert.equal(resolveRuntimeStepsLogPath(), null);
  } finally {
    if (prev === undefined) delete process.env.HKTM_RUNTIME_STEPS_LOG;
    else process.env.HKTM_RUNTIME_STEPS_LOG = prev;
  }
});

test("installRuntimeStepLogFromEnv appends to file when path is set", () => {
  const tmp = path.join(os.tmpdir(), `hktm-runtime-steps-${Date.now()}.log`);
  const prevLog = process.env.HKTM_RUNTIME_STEPS_LOG;
  process.env.HKTM_RUNTIME_STEPS_LOG = tmp;
  installRuntimeStepLogFromEnv();
  try {
    resetStepDebugChain();
    stepBannerLine("fixture-step", "log");
    const content = fs.readFileSync(tmp, "utf8");
    assert.ok(content.includes("fixture-step"));
    assert.ok(content.includes("type=log"));
  } finally {
    setRuntimeStepAppender(null);
    if (prevLog === undefined) delete process.env.HKTM_RUNTIME_STEPS_LOG;
    else process.env.HKTM_RUNTIME_STEPS_LOG = prevLog;
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
});
