import { execFileSync } from "node:child_process";
import readline from "node:readline";
import { tone } from "./colors.mjs";
import { animSleep, requestAnimTurbo } from "./anim-sleep-core.mjs";
import { isHktmDebug, sceneBannerLine } from "./debug-scene.mjs";

readline.emitKeypressEvents(process.stdin);

/** Node CLI / TTY only: Space arms ~100× animation turbo (see `anim-sleep-core.mjs`). The browser build does not use this — it has its own shell wiring in `web/main.js`. */
if (typeof process !== "undefined" && process.stdin?.isTTY) {
  process.stdin.on("keypress", (str, key) => {
    if (!key || key.ctrl || key.meta) return;
    const space = key.name === "space" || str === " ";
    if (space) {
      requestAnimTurbo();
    }
  });
}

const ANSI_SEQ = /\x1b\[[0-9;]*m/g;
const DIRECTION_ALIAS_MAP = new Map([
  ["w", "up"],
  ["a", "left"],
  ["s", "down"],
  ["d", "right"],
]);

export function stripAnsi(s) {
  return String(s).replace(ANSI_SEQ, "");
}

export function visibleLen(s) {
  return stripAnsi(s).length;
}

function repeat(char, count) {
  return count > 0 ? char.repeat(count) : "";
}

const uiState = {
  mode: "plain", // plain | pip
  width: 74,
  typing: false,
  cps: 800, // characters per second (rough)
  beep: false,
};

let pagerHooks = {
  pause: () => {},
  resume: () => {},
};

export function setPagerHooks(hooks) {
  if (hooks?.pause) pagerHooks.pause = hooks.pause;
  if (hooks?.resume) pagerHooks.resume = hooks.resume;
}

/** Node `game.mjs` wires readline-based choice; tests / headless fall back to raw keypress. */
let waitChoiceImpl = null;
let waitDirectionImpl = null;

export function setWaitChoiceImpl(fn) {
  waitChoiceImpl = typeof fn === "function" ? fn : null;
}

export function setWaitDirectionImpl(fn) {
  waitDirectionImpl = typeof fn === "function" ? fn : null;
}

function waitForDigitKeypress(max) {
  return new Promise((resolve) => {
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        process.exit(1);
      }
      const n = Number(str);
      if (Number.isInteger(n) && n >= 1 && n <= max) {
        process.stdin.removeListener("keypress", onKey);
        resolve(n);
      }
    };
    process.stdin.on("keypress", onKey);
  });
}

function keypressToDirection(str, key) {
  const raw = key?.name ?? str;
  return resolveDirectionAlias(raw);
}

export function resolveDirectionAlias(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "up" || normalized === "down" || normalized === "left" || normalized === "right") {
    return normalized;
  }
  return DIRECTION_ALIAS_MAP.get(normalized) ?? null;
}

/**
 * Wait for user to pick a number 1–max.
 * @param {number} max
 * @param {string} [footerHint]
 * @returns {Promise<number>}
 */
export async function waitForChoiceN(max, footerHint = "") {
  if (waitChoiceImpl) {
    return waitChoiceImpl(footerHint, max);
  }
  if (footerHint) console.log(tone(footerHint, "dim"));
  if (!process.stdin.isTTY) return 1;
  pagerHooks.pause();
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    return await waitForDigitKeypress(max);
  } finally {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
    }
    pagerHooks.resume();
  }
}

/** @deprecated Use waitForChoiceN(3, footerHint) instead. */
export async function waitForChoice3(footerHint = "") {
  return waitForChoiceN(3, footerHint);
}

/**
 * Wait for one of the allowed arrow directions.
 * @param {Array<"up" | "down" | "left" | "right">} allowedDirections
 * @param {string} [footerHint]
 * @returns {Promise<"up" | "down" | "left" | "right">}
 */
export async function waitForArrowDirection(allowedDirections, footerHint = "") {
  const allowed = Array.from(new Set((allowedDirections ?? []).filter(Boolean)));
  if (allowed.length === 0) {
    throw new Error("waitForArrowDirection requires at least one allowed direction");
  }
  if (waitDirectionImpl) {
    return waitDirectionImpl(footerHint, allowed);
  }
  if (footerHint) console.log(tone(footerHint, "dim"));
  if (!process.stdin.isTTY) return allowed[0];
  pagerHooks.pause();
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    return await new Promise((resolve) => {
      const onKey = (str, key) => {
        if (key?.ctrl && key.name === "c") {
          process.stdin.removeListener("keypress", onKey);
          process.exit(1);
        }
        const direction = keypressToDirection(str, key);
        if (!direction || !allowed.includes(direction)) return;
        process.stdin.removeListener("keypress", onKey);
        resolve(direction);
      };
      process.stdin.on("keypress", onKey);
    });
  } finally {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
    }
    pagerHooks.resume();
  }
}

/**
 * Clear the terminal. In DEBUG mode (default), prints `[SCENE: name type=clear|info prev=…]` as the first line after home.
 * @param {string} [stepName] — omit to clear without a step line (rare transitions).
 * @param {"clear" | "info" | "form"} [kind] — `info` for glossary / `info` command screens; `form` for compose-mail wizard steps (blank page + debug line).
 */
export function clearTerminalScreen(stepName, kind = "clear") {
  process.stdout.write("\x1b[2J\x1b[H");
  if (isHktmDebug() && typeof stepName === "string" && stepName.length > 0) {
    const k = kind === "info" ? "info" : kind === "form" ? "form" : "clear";
    console.log(tone(sceneBannerLine(stepName, k), "dim"));
  }
}

/** First line of a screen that does not use `clearTerminalScreen` (e.g. splash before pixel art). */
export function logScreenStep(stepName, options = {}) {
  if (isHktmDebug() && typeof stepName === "string" && stepName.length > 0) {
    console.log(tone(sceneBannerLine(stepName, "log", options), "dim"));
  }
}

/** DEBUG: `info` — `[SCENE: …-after type=pause]` before `waitForEnterContinue` (pager logs `[SCENE: … type=log]`). */
export function logInfoPauseStep(stepName) {
  if (isHktmDebug() && typeof stepName === "string" && stepName.length > 0) {
    console.log(tone(sceneBannerLine(`${stepName}-after`, "pause"), "dim"));
  }
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** Discard buffered stdin so a pager does not treat the previous line’s Enter as “next page”. */
export function drainStdinSync() {
  if (!process.stdin.isTTY) return;
  try {
    let chunk;
    while (process.stdin.readableLength > 0 && (chunk = process.stdin.read()) != null) {
      /* discard */
    }
  } catch {
    /* ignore */
  }
}

/** Pager keys via readline keypress (arrows arrive whole; avoids split-escape bugs on Windows). */
function waitPagerKeyOnce() {
  return new Promise((resolve) => {
    const onKey = (str, key) => {
      process.stdin.removeListener("keypress", onKey);
      if (key?.ctrl && key.name === "c") {
        return resolve("quit");
      }
      if (!key) {
        if (str === "\r" || str === "\n") return resolve("next");
        if (str === " " || str === "\t") return resolve("next");
        if (str === "q" || str === "Q") return resolve("quit");
        return resolve("next");
      }
      const n = key.name;
      if (n === "down" || n === "return" || n === "enter" || n === "space") return resolve("next");
      if (n === "up") return resolve("prev");
      if (n === "escape" || n === "q") return resolve("quit");
      return resolve("next");
    };
    process.stdin.once("keypress", onKey);
  });
}

/** Enter advances only (Space is free for animation turbo). q / Esc / Ctrl+C exit; other keys ignored. */
function waitEnterPagerKeyOnce() {
  return new Promise((resolve) => {
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        return resolve("quit");
      }
      if (!key) {
        if (str === "\r" || str === "\n") {
          process.stdin.removeListener("keypress", onKey);
          return resolve("next");
        }
        if (str === "q" || str === "Q") {
          process.stdin.removeListener("keypress", onKey);
          return resolve("quit");
        }
        return;
      }
      const n = key.name;
      if (n === "return" || n === "enter") {
        process.stdin.removeListener("keypress", onKey);
        return resolve("next");
      }
      if (n === "escape" || n === "q") {
        process.stdin.removeListener("keypress", onKey);
        return resolve("quit");
      }
    };
    process.stdin.on("keypress", onKey);
  });
}

/**
 * When set (by `game.mjs`), `waitForEnterContinue` delegates here so readline can stay paused
 * while stdin is raw (Enter-only). Space does not dismiss — it only arms animation turbo.
 */
let waitEnterContinueImpl = null;

export function setWaitEnterContinueImpl(fn) {
  waitEnterContinueImpl = typeof fn === "function" ? fn : null;
}

/**
 * Wait for Enter to continue. Used by CLI boot and `game.mjs`.
 * When `readlineInterface` is set (always from `game.mjs` via `waitForBootEnterLine`), we use readline
 * only — raw mode + keypress is flaky on Windows (spurious newlines / immediate finish) and can destabilize stdin.
 * @param {{ readlineInterface?: import("node:readline").Interface }} [options]
 */
export function waitForEnterContinueRaw(footerHint = "", options = {}) {
  const rl = options.readlineInterface;
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve();
      return;
    }
    try {
      process.stdin.ref();
    } catch {
      /* ignore */
    }
    if (footerHint) console.log(tone(footerHint, "dim"));
    pagerHooks.pause();
    const finish = () => {
      try {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
      pagerHooks.resume();
      try {
        if (process.stdin.isTTY) process.stdin.ref();
      } catch {
        /* ignore */
      }
      setImmediate(() => {
        setImmediate(() => resolve());
      });
    };

    const runReadlineEnterWait = () => {
      pagerHooks.resume();
      let prevPrompt = "> ";
      if (typeof rl.getPrompt === "function") {
        try {
          prevPrompt = rl.getPrompt();
        } catch {
          /* ignore */
        }
      }
      try {
        rl.resume();
      } catch {
        /* ignore */
      }
      /* Defer so stray buffered lines from pause/resume do not fire `line` before the user sees the hint. */
      setImmediate(() => {
        drainStdinSync();
        rl.once("line", () => {
          try {
            rl.setPrompt(prevPrompt);
          } catch {
            /* ignore */
          }
          try {
            rl.pause();
          } catch {
            /* ignore */
          }
          finish();
        });
        rl.setPrompt("");
        try {
          rl.prompt();
        } catch {
          try {
            setImmediate(() => {
              try {
                rl.prompt();
              } catch {
                /* ignore — line listener may still fire on Enter */
              }
            });
          } catch {
            /* ignore */
          }
        }
      });
    };

    /* Game shell always passes rl — prefer readline over raw+keypress (reliable on Windows external terminals). */
    if (rl) {
      runReadlineEnterWait();
      return;
    }

    try {
      process.stdin.setRawMode(true);
    } catch {
      finish();
      return;
    }
    try {
      let chunk;
      while (process.stdin.readableLength > 0 && (chunk = process.stdin.read()) != null) {
        /* discard */
      }
    } catch {
      /* ignore */
    }
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        finish();
        return;
      }
      if (!key) {
        if (str === "\r" || str === "\n") {
          process.stdin.removeListener("keypress", onKey);
          finish();
        }
        return;
      }
      const n = key.name;
      if (n === "return" || n === "enter") {
        process.stdin.removeListener("keypress", onKey);
        finish();
      }
    };
    setImmediate(() => {
      process.stdin.on("keypress", onKey);
    });
  });
}

/** Pause readline, raw stdin, wait for Enter — or CLI override. */
export function waitForEnterContinue(footerHint = "") {
  if (waitEnterContinueImpl) {
    return waitEnterContinueImpl(footerHint);
  }
  return waitForEnterContinueRaw(footerHint);
}

/**
 * Plain lines (e.g. help), chunked to terminal height with arrow navigation.
 * @param {string} [stepBase] DEBUG step id prefix (one screen per page: `${stepBase}-${n}`).
 */
export async function pagedPlainLines(lines, footerHint = "", stepBase = "paged-plain") {
  const hint = footerHint || "↓ Enter/Space next  ↑ prev  q exit";
  const r = process.stdout.rows || 24;
  const maxLines = Math.max(1, r - 3);
  const chunks = chunkArray(lines, maxLines);
  if (!process.stdin.isTTY || chunks.length <= 1) {
    logScreenStep(stepBase);
    for (const l of lines) console.log(l);
    return;
  }
  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    drainStdinSync();
    while (true) {
      clearTerminalScreen(`${stepBase}-${page + 1}`);
      for (const l of chunks[page]) {
        console.log(l);
      }
      console.log(tone(hint, "dim"));
      const key = await waitPagerKeyOnce();
      if (key === "quit") break;
      if (key === "next") {
        if (page < chunks.length - 1) page += 1;
        else break;
      }
      if (key === "prev") page = Math.max(0, page - 1);
    }
  } finally {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
    }
    pagerHooks.resume();
    clearTerminalScreen(`${stepBase}-exit`);
  }
}

/**
 * Like boxPaged but only Enter advances pages (no ↑/↓ history). q / Esc exit.
 * @param {string} [stepBase] DEBUG step id prefix (one screen per page).
 */
export async function boxEnterPaged(title, lines, width = uiState.width, footerHint = "", stepBase = "box-enter-paged") {
  const hint = footerHint || "Enter next page  q exit";
  const w = Math.max(12, Math.floor(width));
  const inner = w - 4;
  const flat = flattenBoxBodyLines(lines, inner);
  const rows = process.stdout.rows || 24;
  const maxBody = Math.max(4, rows - 6);
  if (!process.stdin.isTTY || flat.length <= maxBody) {
    logScreenStep(stepBase);
    await box(title, lines, width);
    return;
  }
  const chunks = chunkArray(flat, maxBody);
  if (chunks.length <= 1) {
    logScreenStep(stepBase);
    await box(title, lines, width);
    return;
  }

  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    drainStdinSync();
    const titlePlain = stripAnsi(title);
    while (true) {
      clearTerminalScreen(`${stepBase}-${page + 1}`);
      const pageTitle = tone(`${titlePlain} (${page + 1}/${chunks.length})`, "bold");
      await box(pageTitle, chunks[page], width);
      console.log(tone(hint, "dim"));
      const key = await waitEnterPagerKeyOnce();
      if (key === "quit") break;
      if (page < chunks.length - 1) page += 1;
      else break;
    }
  } finally {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
    }
    pagerHooks.resume();
    clearTerminalScreen(`${stepBase}-exit`);
  }
}

export function setUiOptions(options) {
  if (!options) return;
  if (options.mode) uiState.mode = options.mode;
  if (typeof options.width === "number") uiState.width = options.width;
  if (typeof options.typing === "boolean") uiState.typing = options.typing;
  if (typeof options.cps === "number") uiState.cps = options.cps;
  if (typeof options.beep === "boolean") uiState.beep = options.beep;
}

export function getUiOptions() {
  return { ...uiState };
}

let lastBellAt = 0;
const BELL_THROTTLE_MS = 40;

/** Short BEL to stdout/stderr (IDE terminals often mute; use playTestBeep on Windows to verify). */
function bell() {
  if (!uiState.beep) return;
  const now = Date.now();
  if (now - lastBellAt < BELL_THROTTLE_MS) return;
  lastBellAt = now;
  try {
    process.stdout.write("\x07");
  } catch {
    /* ignore */
  }
  try {
    process.stderr.write("\x07");
  } catch {
    /* ignore */
  }
}

/** Short feedback tone (BEL or Web Audio via ui-browser shim). */
export function notifyBell() {
  bell();
}

/**
 * One audible beep (Windows: speaker tone). Call when enabling beeps so users can confirm sound works.
 */
export function playTestBeep() {
  if (process.platform === "win32") {
    try {
      execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", "[Console]::Beep(880, 160)"],
        { stdio: "ignore", windowsHide: true, timeout: 400 },
      );
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    process.stdout.write("\x07");
  } catch {
    /* ignore */
  }
  try {
    process.stderr.write("\x07");
  } catch {
    /* ignore */
  }
}

async function typeLine(line) {
  if (!uiState.typing) {
    console.log(line);
    if (uiState.beep) bell();
    return;
  }
  if (!process.stdout.isTTY) {
    console.log(line);
    if (uiState.beep) bell();
    return;
  }

  const delay = Math.max(1, Math.floor(1000 / uiState.cps));
  // Turbo only: skip per-character delay (still awaited as a full line before the next prompt).
  if (uiState.cps >= 20000) {
    console.log(line);
    if (uiState.beep) bell();
    return;
  }

  for (let i = 0; i < line.length; i += 1) {
    process.stdout.write(line[i]);
    if (line[i] !== " " && (i % 3 === 0)) {
      bell();
    }
    // tiny pacing; keep it subtle
    // eslint-disable-next-line no-await-in-loop
    await animSleep(delay);
  }
  process.stdout.write("\n");
}

export async function box(title, lines, width = uiState.width) {
  const w = Math.max(12, Math.floor(width));
  const top = `┌${repeat("─", w - 2)}┐`;
  const bottom = `└${repeat("─", w - 2)}┘`;
  const headerText = title ? ` ${title} ` : "";
  const header =
    title && visibleLen(headerText) < w - 2
      ? `├${repeat("─", 2)}${headerText}${repeat("─", w - 4 - visibleLen(headerText))}┤`
      : null;

  const frameTone = uiState.mode === "pip" ? "green" : "dim";
  const bodyTone = uiState.mode === "pip" ? "green" : null;

  const emit = async (s) => {
    const out = bodyTone ? tone(s, bodyTone) : s;
    await typeLine(out);
  };

  await emit(tone(top, frameTone));
  if (header) await emit(tone(header, frameTone));
  const inner = w - 4;
  for (const rawLine of lines) {
    const rows =
      rawLine === ""
        ? [""]
        : visibleLen(rawLine) <= inner
          ? [rawLine]
          : wrap(rawLine, inner);
    for (const line of rows) {
      const pad = Math.max(0, inner - visibleLen(line));
      const body = `${tone("│", frameTone)} ${line}${repeat(" ", pad)} ${tone("│", frameTone)}`;
      await emit(body);
    }
  }
  await emit(tone(bottom, frameTone));
}

/** Split a single token into chunks no longer than `width` visible characters. */
function splitPlainOverflow(token, width) {
  if (width < 1) return [token];
  if (visibleLen(token) <= width) return [token];
  const p = stripAnsi(token);
  const out = [];
  for (let i = 0; i < p.length; i += width) {
    out.push(p.slice(i, i + width));
  }
  return out;
}

/**
 * Word-wrap to `width` using **visible** character counts (ANSI sequences ignored for layout).
 */
export function wrap(text, width = 70) {
  const w = Math.max(8, Math.floor(width));
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  let lineVis = 0;

  for (const word of words) {
    if (word === "") continue;
    const chunks = splitPlainOverflow(word, w);
    for (const chunk of chunks) {
      const cv = visibleLen(chunk);
      if (!line) {
        line = chunk;
        lineVis = cv;
        continue;
      }
      if (lineVis + 1 + cv > w) {
        lines.push(line);
        line = chunk;
        lineVis = cv;
      } else {
        line += ` ${chunk}`;
        lineVis += 1 + cv;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function flattenBoxBodyLines(rawLines, inner) {
  const out = [];
  for (const rawLine of rawLines) {
    const rows =
      rawLine === ""
        ? [""]
        : visibleLen(rawLine) <= inner
          ? [rawLine]
          : wrap(rawLine, inner);
    for (const line of rows) {
      out.push(line);
    }
  }
  return out;
}

/**
 * Box with body split across pages so each view fits the terminal; ↑↓ Enter Space q.
 * @param {string} [stepBase] DEBUG step id prefix (one screen per page).
 * @param {{ stepDebugKind?: "log" | "info" }} [options] — `info`: full clear + `type=info` steps (glossary pager).
 */
export async function boxPaged(title, lines, width = uiState.width, footerHint = "", stepBase = "box-paged", options = {}) {
  const stepDebugKind = options.stepDebugKind === "info" ? "info" : "log";
  const hint = footerHint || "↓ Enter/Space next  ↑ prev  q exit";
  const w = Math.max(12, Math.floor(width));
  const inner = w - 4;
  const flat = flattenBoxBodyLines(lines, inner);
  const rows = process.stdout.rows || 24;
  const maxBody = Math.max(4, rows - 6);
  if (!process.stdin.isTTY || flat.length <= maxBody) {
    if (stepDebugKind === "info") clearTerminalScreen(stepBase, "info");
    else logScreenStep(stepBase);
    await box(title, lines, width);
    return;
  }
  const chunks = chunkArray(flat, maxBody);
  if (chunks.length <= 1) {
    if (stepDebugKind === "info") clearTerminalScreen(stepBase, "info");
    else logScreenStep(stepBase);
    await box(title, lines, width);
    return;
  }

  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    drainStdinSync();
    const titlePlain = stripAnsi(title);
    const pageKind = stepDebugKind === "info" ? "info" : "clear";
    while (true) {
      clearTerminalScreen(`${stepBase}-${page + 1}`, pageKind);
      const pageTitle = tone(`${titlePlain} (${page + 1}/${chunks.length})`, "bold");
      await box(pageTitle, chunks[page], width);
      console.log(tone(hint, "dim"));
      const key = await waitPagerKeyOnce();
      if (key === "quit") break;
      if (key === "next") {
        if (page < chunks.length - 1) page += 1;
        else break;
      }
      if (key === "prev") page = Math.max(0, page - 1);
    }
  } finally {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* ignore */
      }
    }
    pagerHooks.resume();
    clearTerminalScreen(`${stepBase}-exit`);
  }
}
