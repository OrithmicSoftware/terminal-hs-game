/**
 * Ghost default line on stdin while sharing the process readline.Interface.
 * Pauses readline, resumes stdin (readline.pause() pauses stdin — no keypress otherwise),
 * no-ops readline’s _ttyWrite so keys don’t hit the line buffer, then restores.
 */
import { tone } from "./colors.mjs";

const GRAY = "\x1b[90m";
const RST = "\x1b[0m";

/**
 * @param {string} promptPlain
 * @param {string} ghostDefault
 * @param {{
 *   maxLen?: number,
 *   pause?: () => void,
 *   resume?: () => void,
 *   skipResumeAfterCleanup?: boolean,
 *   readlineInterface?: import("readline").Interface & { _ttyWrite?: (s: string | undefined, key: object) => void },
 * }} [opts] — `skipResumeAfterCleanup`: between chained ghost prompts, omit cleanup newline + `resume` so the next prompt redraws on the same row (no double blank gap).
 * @returns {Promise<string>}
 */
export function readLineWithGhostDefault(promptPlain, ghostDefault, opts = {}) {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const maxLen = opts.maxLen ?? 256;
  const ghost = String(ghostDefault ?? "");
  const rl = opts.readlineInterface;

  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.resolve(ghost);
  }

  if (!rl || typeof rl._ttyWrite !== "function") {
    return Promise.resolve(ghost);
  }

  opts.pause?.();

  try {
    stdin.resume();
  } catch {
    /* ignore */
  }

  const origTtyWrite = rl._ttyWrite.bind(rl);
  rl._ttyWrite = () => {};

  return new Promise((resolve) => {
    let buffer = "";
    let ghostVisible = true;

    const redraw = () => {
      const p = tone(promptPlain, "cyan");
      stdout.write("\r\x1b[K");
      if (buffer.length === 0 && ghostVisible && ghost.length > 0) {
        stdout.write(p + GRAY + ghost + RST);
        stdout.write(`\x1b[${ghost.length}D`);
      } else {
        stdout.write(p + buffer);
      }
    };

    const cleanup = () => {
      stdin.removeListener("keypress", onKeypress);
      rl._ttyWrite = origTtyWrite;
      /* Chained ghost prompts: skip newline so the next redraw (\r\x1b[K) clears this line — avoids a double blank gap. */
      if (!opts.skipResumeAfterCleanup) {
        stdout.write("\n");
        opts.resume?.();
      }
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    /**
     * @param {string} ch
     */
    function appendChars(ch) {
      for (const unit of ch) {
        if (unit === "\r" || unit === "\n") continue;
        if (buffer.length >= maxLen) break;
        if (ghostVisible && buffer.length === 0) {
          ghostVisible = false;
          buffer = unit;
        } else {
          buffer += unit;
        }
      }
    }

    /**
     * @param {string | undefined} str
     * @param {import("readline").Key | undefined} key
     */
    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === "return" || key.name === "enter") {
        if (buffer.length === 0 && ghostVisible && ghost.length > 0) {
          finish(ghost);
        } else {
          finish(buffer);
        }
        return;
      }

      if (key.name === "backspace") {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
        }
        if (buffer.length === 0) {
          ghostVisible = true;
        }
        redraw();
        return;
      }

      if (key.ctrl && key.name === "c") {
        stdin.removeListener("keypress", onKeypress);
        rl._ttyWrite = origTtyWrite;
        opts.resume?.();
        process.exit(130);
        return;
      }

      if (key.sequence && str && str.length > 0 && !key.ctrl) {
        appendChars(str);
        redraw();
      }
    }

    stdin.on("keypress", onKeypress);
    redraw();
  });
}
