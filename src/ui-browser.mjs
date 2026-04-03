/**
 * Browser UI shim: no readline / raw stdin; output via `process.stdout.write` polyfill.
 */
import { tone } from "./colors-browser.mjs";

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
  mode: "pip",
  width: 80,
  typing: false,
  cps: 24000,
  beep: true,
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
  if (typeof globalThis.__HKTM_CLEAR === "function") globalThis.__HKTM_CLEAR();
  else process.stdout.write("\x1b[2J\x1b[H");
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const enterWaiters = [];

export function waitForEnterContinue(footerHint = "") {
  return new Promise((resolve) => {
    if (footerHint) console.log(tone(footerHint, "dim"));
    enterWaiters.push(resolve);
  });
}

export function __hktmFlushEnterWaiter() {
  const r = enterWaiters.shift();
  if (r) r();
}

export async function pagedPlainLines(lines, footerHint = "") {
  for (const l of lines) console.log(l);
  if (footerHint) console.log(tone(footerHint, "dim"));
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function typeLine(line) {
  if (!uiState.typing || uiState.cps >= 20000) {
    console.log(line);
    return;
  }
  const delay = Math.max(1, Math.floor(1000 / uiState.cps));
  for (let i = 0; i < line.length; i += 1) {
    process.stdout.write(line[i]);
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

export async function boxEnterPaged(title, lines, width = uiState.width, footerHint = "") {
  await box(title, lines, width);
  if (footerHint) console.log(tone(footerHint, "dim"));
}

export async function boxPaged(title, lines, width = uiState.width, footerHint = "") {
  await box(title, lines, width);
  if (footerHint) console.log(tone(footerHint, "dim"));
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

function bell() {
  if (!uiState.beep) return;
  if (typeof globalThis.__HKTM_BEEP === "function") globalThis.__HKTM_BEEP();
}

export function notifyBell() {
  bell();
}

export function playTestBeep() {
  bell();
}
