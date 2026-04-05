/**
 * Shared labels + typewriter line for `test sound` (Node BEL sweep + browser full audition).
 * Plain ANSI only (no colors.mjs) so the web bundle does not pull Node `stdout`.
 */
import { animSleep } from "./anim-sleep-core.mjs";

const ANSI_CYAN = "\x1b[36m";
const ANSI_RESET = "\x1b[0m";

/**
 * Typewriter-style animation for an event name (uses CR clear — best in TTY / web terminal).
 * @param {string} line
 * @param {number} [charMs]
 */
export async function animateEventLabel(line, charMs = 12) {
  const text = `▸ ${line}`;
  for (let i = 0; i <= text.length; i += 1) {
    process.stdout.write(`\r\x1b[K${ANSI_CYAN}${text.slice(0, i)}${ANSI_RESET}`);
    await animSleep(charMs);
  }
  process.stdout.write("\n");
}

/** Same order as `runTerminalSoundSelfTest` in web/ui-sounds.mjs */
export const SOUND_TEST_EVENT_LABELS = [
  "loading_tick.probe",
  "loading_tick.enum",
  "loading_tick.exploit",
  "output_render.probe",
  "output_render.enum",
  "output_render.exploit",
  "soft_render",
  "typing_key.char",
  "typing_key.delete",
  "ui_select",
  "ui_browse",
  "ui_click",
  "alarm_rise",
  "alarm_reduce",
  "chat_swipe_open",
  "chat_swipe_close",
  "enter_beep",
];
