import { execFileSync } from "node:child_process";
import readline from "node:readline";
import { tone } from "./colors.mjs";

readline.emitKeypressEvents(process.stdin);

const ANSI_SEQ = /\x1b\[[0-9;]*m/g;

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

export function clearTerminalScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
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

/** Enter/Space advance only (no ↑/↓). q / Esc / Ctrl+C exit; other keys ignored. */
function waitEnterPagerKeyOnce() {
  return new Promise((resolve) => {
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        return resolve("quit");
      }
      if (!key) {
        if (str === "\r" || str === "\n" || str === " ") {
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
      if (n === "return" || n === "enter" || n === "space") {
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
 * Pause readline, raw stdin, wait for Enter or Space (boot / intro).
 */
export function waitForEnterContinue(footerHint = "") {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve();
      return;
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
      // Defer so readline can consume Enter after resume (avoids Windows/Cursor exit before splash).
      setImmediate(() => resolve());
    };
    try {
      process.stdin.setRawMode(true);
    } catch {
      finish();
      return;
    }
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.removeListener("keypress", onKey);
        finish();
        return;
      }
      if (!key) {
        if (str === "\r" || str === "\n" || str === " ") {
          process.stdin.removeListener("keypress", onKey);
          finish();
        }
        return;
      }
      const n = key.name;
      if (n === "return" || n === "enter" || n === "space") {
        process.stdin.removeListener("keypress", onKey);
        finish();
      }
    };
    process.stdin.on("keypress", onKey);
  });
}

/**
 * Plain lines (e.g. help), chunked to terminal height with arrow navigation.
 */
export async function pagedPlainLines(lines, footerHint = "") {
  const hint = footerHint || "↓ Enter/Space next  ↑ prev  q exit";
  const r = process.stdout.rows || 24;
  const maxLines = Math.max(1, r - 3);
  const chunks = chunkArray(lines, maxLines);
  if (!process.stdin.isTTY || chunks.length <= 1) {
    for (const l of lines) console.log(l);
    return;
  }
  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    while (true) {
      clearTerminalScreen();
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
    clearTerminalScreen();
  }
}

/**
 * Like boxPaged but only Enter/Space advance (no ↑/↓ history). q / Esc exit.
 */
export async function boxEnterPaged(title, lines, width = uiState.width, footerHint = "") {
  const hint = footerHint || "Enter/Space next page  q exit";
  const w = Math.max(12, Math.floor(width));
  const inner = w - 4;
  const flat = flattenBoxBodyLines(lines, inner);
  const rows = process.stdout.rows || 24;
  const maxBody = Math.max(4, rows - 6);
  if (!process.stdin.isTTY || flat.length <= maxBody) {
    await box(title, lines, width);
    return;
  }
  const chunks = chunkArray(flat, maxBody);
  if (chunks.length <= 1) {
    await box(title, lines, width);
    return;
  }

  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    const titlePlain = stripAnsi(title);
    while (true) {
      clearTerminalScreen();
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
    clearTerminalScreen();
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    await sleep(delay);
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
          : wrap(stripAnsi(rawLine), inner);
    for (const line of rows) {
      const pad = Math.max(0, inner - visibleLen(line));
      const body = `${tone("│", frameTone)} ${line}${repeat(" ", pad)} ${tone("│", frameTone)}`;
      await emit(body);
    }
  }
  await emit(tone(bottom, frameTone));
}

/** Split a single token into chunks no longer than `width` (plain text). */
function splitPlainOverflow(token, width) {
  if (width < 1) return [token];
  const p = stripAnsi(token);
  if (p.length <= width) return [p];
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
          : wrap(stripAnsi(rawLine), inner);
    for (const line of rows) {
      out.push(line);
    }
  }
  return out;
}

/**
 * Box with body split across pages so each view fits the terminal; ↑↓ Enter Space q.
 */
export async function boxPaged(title, lines, width = uiState.width, footerHint = "") {
  const hint = footerHint || "↓ Enter/Space next  ↑ prev  q exit";
  const w = Math.max(12, Math.floor(width));
  const inner = w - 4;
  const flat = flattenBoxBodyLines(lines, inner);
  const rows = process.stdout.rows || 24;
  const maxBody = Math.max(4, rows - 6);
  if (!process.stdin.isTTY || flat.length <= maxBody) {
    await box(title, lines, width);
    return;
  }
  const chunks = chunkArray(flat, maxBody);
  if (chunks.length <= 1) {
    await box(title, lines, width);
    return;
  }

  pagerHooks.pause();
  let page = 0;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    const titlePlain = stripAnsi(title);
    while (true) {
      clearTerminalScreen();
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
    clearTerminalScreen();
  }
}
