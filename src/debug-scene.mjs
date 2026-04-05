/**
 * DEBUG screen labels (`[SCENE: name type=kind prev=previousName]`; optional ` animate=false`). On by default; set `HKTM_DEBUG=0` to disable.
 *
 * **Runtime log (fixtures / sharing):** `game.mjs` installs file append via
 * `installRuntimeSceneLogFromEnv()` from `debug-scene-runtime-log.mjs`. Set `HKTM_RUNTIME_SCENES_LOG=1` to append
 * each scene line to `logs/runtime.log` under cwd, or `HKTM_RUNTIME_SCENES_LOG=/path/to/file.log`. Disable with
 * `HKTM_RUNTIME_SCENES_LOG=0`. Legacy `HKTM_RUNTIME_STEPS_LOG` is still read if the new variable is unset.
 * Browser builds never register the appender (no file I/O).
 *
 * **`logRuntimeAction`** — when the same file appender is active, `game.mjs` logs user input lines as
 * `[ACTION: shell|chat|choice|operator] …` (truncated) interleaved with `[SCENE: …]` for reproduction.
 * Set `HKTM_RUNTIME_LOG_SEQ=1` to prefix every line with `[seq:N]` (monotonic).
 */

/** Last scene `name` for `prev=` on the next line (session-local). */
let lastSceneName = "none";

/** Monotonic counter for HKTM_RUNTIME_LOG_SEQ=1 (reset with `resetSceneDebugChain`). */
let runtimeLogSeq = 0;

/** Optional hook: Node `game.mjs` sets file append; tests may set a capture function. */
let runtimeSceneAppender = null;

/** Reset the prev chain (e.g. tests or a fresh boot). */
export function resetSceneDebugChain() {
  lastSceneName = "none";
  runtimeLogSeq = 0;
}

function nextRuntimeSeqPrefix() {
  try {
    const v = process.env.HKTM_RUNTIME_LOG_SEQ;
    if (v === undefined || v === "") return "";
    const lower = String(v).toLowerCase();
    if (lower === "0" || lower === "false" || lower === "off" || lower === "no") return "";
  } catch {
    return "";
  }
  runtimeLogSeq += 1;
  return `[seq:${runtimeLogSeq}] `;
}

/** @returns {string} Last scene id used for `prev=` (session-local). */
export function getLastSceneName() {
  return lastSceneName;
}

/**
 * Replace or clear the callback invoked for each plain scene line (no ANSI). Pass `null` to disable.
 * @param {null | ((line: string) => void)} fn
 */
export function setRuntimeSceneAppender(fn) {
  runtimeSceneAppender = typeof fn === "function" ? fn : null;
}

/** @returns {boolean} */
export function isHktmDebug() {
  const v = process.env.HKTM_DEBUG;
  if (v === undefined || v === "") return true;
  const s = String(v).toLowerCase();
  return s !== "0" && s !== "false" && s !== "off" && s !== "no";
}

function appendRuntimeSceneLine(line) {
  if (typeof runtimeSceneAppender !== "function") return;
  try {
    runtimeSceneAppender(`${nextRuntimeSeqPrefix()}${line}`);
  } catch {
    /* ignore */
  }
}

/**
 * Log a user input line when runtime file logging is enabled (same `HKTM_RUNTIME_SCENES_LOG` as scenes).
 * `kind`: `shell` (mission `>`), `chat` (ShadowNet IM line), `choice` (numbered UI choice), `operator` (setup).
 * @param {string} kind
 * @param {string} [detail]
 */
export function logRuntimeAction(kind, detail = "") {
  if (typeof runtimeSceneAppender !== "function") return;
  const raw = String(detail ?? "");
  const trunc = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
  const line = `[ACTION: ${kind}] ${trunc}`;
  appendRuntimeSceneLine(line);
}

/**
 * @param {string} name
 * @param {"clear" | "log" | "info" | "pause" | "form"} [kind] — `clear` after full-screen ANSI home; `log` when no clear; `form` for compose-mail wizard steps; `pause` does not advance `prev` (next scene still points at the pager screen).
 * @param {{ animate?: boolean, prevOverride?: string }} [options] — `prevOverride`: use this for `prev=` instead of `lastSceneName` (still advances `lastSceneName` to `name` when not pause). `animate=false` adds ` animate=false` (e.g. instant kernel replay).
 * @returns {string}
 */
export function sceneBannerLine(name, kind = "clear", options = {}) {
  const prev = options.prevOverride !== undefined ? options.prevOverride : lastSceneName;
  if (kind !== "pause") {
    lastSceneName = name;
  }
  const animatePart = options.animate === false ? " animate=false" : "";
  const line = `[SCENE: ${name} type=${kind} prev=${prev}${animatePart}]`;
  appendRuntimeSceneLine(line);
  return line;
}
