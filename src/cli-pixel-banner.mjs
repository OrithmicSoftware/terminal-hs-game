/**
 * Pixel-frame + block-title banner for the Node CLI splash (fixed layout, no figlet).
 */
import { tone } from "./colors.mjs";

/** Middle rows (top/bottom ▓ borders filled to width at runtime). */
const ART_BODY = [
  "▓▒░                                                    ░▒▓",
  "▓▒░  ████████╗ █████╗  ██████╗██╗  ██╗███████╗███╗   ██╗ ░▒▓",
  "▓▒░  ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗  ██║ ░▒▓",
  "▓▒░     ██║   ███████║██║     █████╔╝ █████╗  ██╔██╗ ██║ ░▒▓",
  "▓▒░     ██║   ██╔══██║██║     ██╔═██╗ ██╔══╝  ██║╚██╗██║ ░▒▓",
  "▓▒░     ██║   ██║  ██║╚██████╗██║  ██╗███████╗██║ ╚████║ ░▒▓",
  "▓▒░     ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ░▒▓",
  "▓▒░                                                    ░▒▓",
  "▓▒░  ███████╗██╗  ██╗███████╗███╗   ███╗██╗███╗   ███╗ ░▒▓",
  "▓▒░  ██╔════╝██║  ██║██╔════╝████╗ ████║██║████╗ ████║ ░▒▓",
  "▓▒░  ███████╗███████║█████╗  ██╔████╔██║██║██╔████╔██║ ░▒▓",
  "▓▒░  ╚════██║██╔══██║██╔══╝  ██║╚██╔╝██║██║██║╚██╔╝██║ ░▒▓",
  "▓▒░  ███████║██║  ██║███████╗██║ ╚═╝ ██║██║██║ ╚═╝ ██║ ░▒▓",
  "▓▒░  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝╚═╝     ╚═╝ ░▒▓",
  "▓▒░                                                    ░▒▓",
];

function padLine(s, innerW) {
  const t = s.length >= innerW ? s.slice(0, innerW) : s + " ".repeat(innerW - s.length);
  return t;
}

/**
 * Print pixel-frame title banner (TERMINAL HACKSIM in UTF-8 block font style).
 */
export function printCliPixelBanner() {
  const innerW = Math.max(...ART_BODY.map((row) => row.length), 1);
  const border = "▓".repeat(innerW);
  const rows = [border, ...ART_BODY.map((row) => padLine(row, innerW)), border];
  const top = `╔${"═".repeat(innerW)}╗`;
  const bot = `╚${"═".repeat(innerW)}╝`;

  console.log("");
  console.log(tone(top, "dim"));
  for (const row of rows) {
    const inner = row;
    console.log(tone("║", "dim") + tone(inner, "green") + tone("║", "dim"));
  }
  console.log(tone(bot, "dim"));
  console.log(
    tone("  ░ ", "cyan") +
      tone("grey-market penetration · trace", "dim") +
      tone(" ░", "cyan"),
  );
  console.log("");
}
