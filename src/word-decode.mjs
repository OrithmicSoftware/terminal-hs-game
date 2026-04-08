import { animSleep, isAnimTurbo } from "./anim-sleep-core.mjs";

const SPECIAL_CHARS = Array.from("!@#$%^&*()-_=+[]{}<>?/|\\~`⟂◈▯◼◻◉◌");
const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function maskToken(token) {
  return /^\s+$/.test(token) || token.length === 0 ? token : Array.from({ length: token.length }, () => "▯").join("");
}

/**
 * Animate a phrase by decoding each word in-place.
 *
 * @param {string} phrase
 * @param {(text: string) => void} renderFn Called each frame with the full phrase text.
 * @param {{ frameMs?: number, revealPerCharMs?: number, turboMs?: number }} [opts]
 */
export async function animatePhraseDecode(phrase, renderFn, opts = {}) {
  const frameMs = typeof opts.frameMs === "number" ? opts.frameMs : 70;
  const revealPerCharMs = typeof opts.revealPerCharMs === "number" ? opts.revealPerCharMs : 28;

  // Keep whitespace tokens so we can reassemble the phrase exactly.
  const sourceTokens = String(phrase ?? "").split(/(\s+)/);
  const tokens = sourceTokens.map(maskToken);

  const effectiveFrameMs = (ms) => (isAnimTurbo() ? Math.max(0, Math.floor(ms / 12)) : ms);

  const render = (toks) => renderFn(toks.join(""));

  for (let ti = 0; ti < sourceTokens.length; ti++) {
    const token = sourceTokens[ti];
    // Skip pure whitespace tokens.
    if (/^\s+$/.test(token) || token.length === 0) continue;

    const len = token.length;

    // Stage 1: broken glyphs (brief)
    for (let f = 0; f < 2; f++) {
      tokens[ti] = Array.from({ length: len }, () => (Math.random() > 0.5 ? "�" : "▯")).join("");
      render(tokens);
      // eslint-disable-next-line no-await-in-loop
      await animSleep(effectiveFrameMs(frameMs));
    }

    // Stage 2: special chars
    for (let f = 0; f < Math.max(3, Math.floor(len / 1.5)); f++) {
      tokens[ti] = Array.from({ length: len }, () => SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)]).join("");
      render(tokens);
      // eslint-disable-next-line no-await-in-loop
      await animSleep(effectiveFrameMs(frameMs));
    }

    // Stage 3: random letters (varying per-frame)
    for (let f = 0; f < Math.max(4, len * 2); f++) {
      tokens[ti] = Array.from({ length: len }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
      render(tokens);
      // eslint-disable-next-line no-await-in-loop
      await animSleep(effectiveFrameMs(Math.max(12, Math.floor(frameMs / 2))));
    }

    // Stage 4: reveal actual letters left-to-right
    let revealed = Array.from({ length: len }, () => "");
    for (let ci = 0; ci < len; ci++) {
      revealed[ci] = token[ci];
      // any remaining positions still show a random letter to keep motion
      for (let r = ci + 1; r < len; r++) {
        revealed[r] = ALPHA[Math.floor(Math.random() * ALPHA.length)];
      }
      tokens[ti] = revealed.join("");
      render(tokens);
      // eslint-disable-next-line no-await-in-loop
      await animSleep(effectiveFrameMs(revealPerCharMs));
    }

    // Ensure exact original token at the end of the word animation.
    tokens[ti] = token;
    render(tokens);
  }
}

export default animatePhraseDecode;
