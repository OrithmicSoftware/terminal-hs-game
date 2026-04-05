/**
 * Node-only: append `[SCENE: …]` and `[ACTION: …]` lines to a file when `HKTM_RUNTIME_SCENES_LOG` is set.
 * `game.mjs` logs readline input (`logRuntimeAction`) interleaved with scenes for replay debugging.
 * Optional `HKTM_RUNTIME_LOG_SEQ=1` prefixes each line with `[seq:N]` (see `debug-scene.mjs`).
 * Imported by `game.mjs` only (not the browser bundle).
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { setRuntimeSceneAppender } from "./debug-scene.mjs";

function resolveScenesLogEnvRaw() {
  const v = process.env.HKTM_RUNTIME_SCENES_LOG;
  if (v !== undefined && v !== "") return v;
  return process.env.HKTM_RUNTIME_STEPS_LOG;
}

/**
 * When a runtime log env var is set, absolute path to the log file; otherwise `null`.
 * Prefers `HKTM_RUNTIME_SCENES_LOG`; falls back to legacy `HKTM_RUNTIME_STEPS_LOG`.
 * @returns {string | null}
 */
export function resolveRuntimeScenesLogPath() {
  try {
    if (typeof process === "undefined" || !process.env || !process.versions?.node) return null;
  } catch {
    return null;
  }
  const v = resolveScenesLogEnvRaw();
  if (v === undefined || v === "") return null;
  const lower = String(v).toLowerCase();
  if (lower === "0" || lower === "false" || lower === "off" || lower === "no") return null;
  if (v === "1" || lower === "true" || lower === "yes") {
    return path.join(process.cwd(), "logs", "runtime.log");
  }
  return path.resolve(process.cwd(), v);
}

/** Call once from `game.mjs` so every `sceneBannerLine` can append when env enables logging. */
export function installRuntimeSceneLogFromEnv() {
  setRuntimeSceneAppender((line) => {
    const logPath = resolveRuntimeScenesLogPath();
    if (!logPath) return;
    try {
      mkdirSync(path.dirname(logPath), { recursive: true });
      appendFileSync(logPath, `${line}\n`, "utf8");
    } catch {
      /* ignore disk errors */
    }
  });
}
