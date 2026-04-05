/** Browser build: same ANSI tokens as `colors.mjs` (terminal emulator renders them). */
const useColor = typeof globalThis !== "undefined" && globalThis.process?.env?.NO_COLOR !== "1";

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

const NODE_IDS = new Set(["local", "gw-edge", "app-api", "db-core"]);

const TERM_RE =
  /ShadowNet\s+IM|ShadowNet|Orion(?:·INT)?|SMTP|SSH|SOC|CVE-[0-9-]+/g;

/** @see colors.mjs */
export function highlightCommandHints(text) {
  if (!text || typeof text !== "string") return text;
  const cmdRe =
    /info\s+(?:[a-z0-9_-]+|<[^>\n]+>)|compose\s+mail|sendmail|exploit\s+(?:[a-z0-9_-]+|<[^>\n]+>)|connect\s+[a-z0-9_-]+|probe\s+[a-z0-9_-]+|mail\s+list|mail\s+read\s+\S+|chat\s+close|enum(?:\s+(?:-f|--force))?|exfil\s+\S+|cat\s+\/[^\s]+|\bcat\b|sql\s+demo|sql\s+translate|\/brief|\/exit|(?:submit|help|tutorial|scan|stash|clear|status|map|cover|spoof|laylow|quit|chat|retry)\b|local\b|gw-edge|app-api|db-core/gi;
  let out = text.replace(cmdRe, (m) => tone(m, NODE_IDS.has(m.toLowerCase()) ? "blue" : "cyan"));
  out = out.replace(TERM_RE, (m) => tone(m, "magenta"));
  return out;
}
