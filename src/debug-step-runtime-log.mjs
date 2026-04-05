/**
 * Node-only: append `[STEP: …]` lines to a file when `HKTM_RUNTIME_STEPS_LOG` is set.
 * Imported by `game.mjs` only (not the browser bundle).
 */
import { appendFileSync } from "node:fs";
import path from "node:path";
import { setRuntimeStepAppender } from "./debug-step.mjs";

/**
 * When `HKTM_RUNTIME_STEPS_LOG` is set, absolute path to the log file; otherwise `null`.
 * @returns {string | null}
 */
export function resolveRuntimeStepsLogPath() {
  try {
    if (typeof process === "undefined" || !process.env || !process.versions?.node) return null;
  } catch {
    return null;
  }
  const v = process.env.HKTM_RUNTIME_STEPS_LOG;
  if (v === undefined || v === "") return null;
  const lower = String(v).toLowerCase();
  if (lower === "0" || lower === "false" || lower === "off" || lower === "no") return null;
  if (v === "1" || lower === "true" || lower === "yes") {
    return path.join(process.cwd(), "runtime_steps.log");
  }
  return path.resolve(process.cwd(), v);
}

/** Call once from `game.mjs` so every `stepBannerLine` can append when env enables logging. */
export function installRuntimeStepLogFromEnv() {
  setRuntimeStepAppender((line) => {
    const logPath = resolveRuntimeStepsLogPath();
    if (!logPath) return;
    try {
      appendFileSync(logPath, `${line}\n`, "utf8");
    } catch {
      /* ignore disk errors */
    }
  });
}
