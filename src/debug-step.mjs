/**
 * DEBUG screen labels (`[STEP: name type=kind prev=previousName]`). On by default; set `HKTM_DEBUG=0` to disable.
 *
 * **Runtime step log (for sharing / fixtures):** `game.mjs` installs file append via
 * `installRuntimeStepLogFromEnv()` from `debug-step-runtime-log.mjs`. Set `HKTM_RUNTIME_STEPS_LOG=1` to append
 * each step line to `runtime_steps.log` in cwd, or `HKTM_RUNTIME_STEPS_LOG=/path/to/steps.log`. Disable with
 * `HKTM_RUNTIME_STEPS_LOG=0`. Browser builds never register the appender (no file I/O).
 */

/** Last step `name` for `prev=` on the next line (session-local). */
let lastStepName = "none";

/** Optional hook: Node `game.mjs` sets file append; tests may set a capture function. */
let runtimeStepAppender = null;

/** Reset the prev chain (e.g. tests or a fresh boot). */
export function resetStepDebugChain() {
  lastStepName = "none";
}

/**
 * Replace or clear the callback invoked for each plain step line (no ANSI). Pass `null` to disable.
 * @param {null | ((line: string) => void)} fn
 */
export function setRuntimeStepAppender(fn) {
  runtimeStepAppender = typeof fn === "function" ? fn : null;
}

/** @returns {boolean} */
export function isHktmDebug() {
  const v = process.env.HKTM_DEBUG;
  if (v === undefined || v === "") return true;
  const s = String(v).toLowerCase();
  return s !== "0" && s !== "false" && s !== "off" && s !== "no";
}

function appendRuntimeStepLine(line) {
  if (typeof runtimeStepAppender !== "function") return;
  try {
    runtimeStepAppender(line);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} name
 * @param {"clear" | "log" | "info" | "pause"} [kind] — `clear` after full-screen ANSI home; `log` when no clear; `pause` does not advance `prev` (next step still points at the pager screen).
 * @returns {string}
 */
export function stepBannerLine(name, kind = "clear") {
  const prev = lastStepName;
  if (kind !== "pause") {
    lastStepName = name;
  }
  const line = `[STEP: ${name} type=${kind} prev=${prev}]`;
  appendRuntimeStepLine(line);
  return line;
}
