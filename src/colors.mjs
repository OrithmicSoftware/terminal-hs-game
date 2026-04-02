import { stdout } from "node:process";

const useColor = stdout.isTTY && process.env.NO_COLOR !== "1";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

export function tone(text, color) {
  if (!useColor) return text;
  return `${c[color] ?? ""}${text}${c.reset}`;
}

export function meter(current, max) {
  const width = 20;
  const ratio = Math.max(0, Math.min(1, current / max));
  const fill = Math.round(width * ratio);
  const bar = `${"#".repeat(fill)}${"-".repeat(width - fill)}`;
  const color = ratio >= 0.8 ? "red" : ratio >= 0.5 ? "yellow" : "green";
  return tone(`[${bar}] ${current}/${max}`, color);
}
