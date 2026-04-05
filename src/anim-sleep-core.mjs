/**
 * Shared animation delays for Node CLI (`game.mjs`) and the browser shell (`web/`).
 * Node: TTY `keypress` (Space) → `requestAnimTurbo` in `ui.mjs`. Browser: separate listeners in `web/main.js`.
 * Web-only: `requestAnimTurbo` may be deferred to a microtask so `execute()` can clear stale turbo before a new command.
 */

const TURBO_MULT = 100;

let turboActive = false;

/** @type {Array<{ deadline: number; finish: () => void; t: ReturnType<typeof setTimeout> }>} */
const pending = [];

function isWebDeferTurbo() {
  try {
    return globalThis.process?.env?.HKTM_WEB === "1";
  } catch {
    return false;
  }
}

function compressPending() {
  const now = Date.now();
  for (const p of pending) {
    clearTimeout(p.t);
    const remaining = Math.max(0, p.deadline - now);
    const newRem = Math.max(0, Math.floor(remaining / TURBO_MULT));
    p.deadline = now + newRem;
    p.t = setTimeout(p.finish, newRem);
  }
}

/**
 * Request ~100× faster animation pacing (delays ÷100) until `resetAnimTurbo` (e.g. end of `execute`).
 * Also compresses any in-flight `animSleep` timers.
 */
export function requestAnimTurbo() {
  const apply = () => {
    turboActive = true;
    compressPending();
  };
  if (isWebDeferTurbo()) {
    queueMicrotask(apply);
  } else {
    apply();
  }
}

export function resetAnimTurbo() {
  turboActive = false;
}

export function isAnimTurbo() {
  return turboActive;
}

export function animSleep(ms) {
  const effective = turboActive ? Math.max(0, Math.floor(ms / TURBO_MULT)) : ms;
  return new Promise((resolve) => {
    const deadline = Date.now() + effective;
    const finish = () => {
      const i = pending.indexOf(rec);
      if (i >= 0) pending.splice(i, 1);
      resolve();
    };
    const rec = { deadline, finish, t: null };
    rec.t = setTimeout(finish, effective);
    pending.push(rec);
  });
}
