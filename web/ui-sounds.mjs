/**
 * Fallout-style terminal UI sounds: selection (move), browsing (focus/tab), click (confirm).
 * Optional WAVs: place ui_select.wav, ui_browse.wav, ui_click.wav under /sounds/fallout_terminal/
 * (e.g. from your own capture of Bethesda’s Fallout terminal SFX — do not redistribute copyrighted audio).
 * If files are missing, short Web Audio synth fallbacks play instead.
 */
import { getUiOptions } from "../src/ui-browser.mjs";

const soundBase = "/sounds/fallout_terminal";
const UI_FILES = {
  select: "ui_select.wav",
  browse: "ui_browse.wav",
  click: "ui_click.wav",
};
const UI_VOL = { select: 0.22, browse: 0.16, click: 0.26 };

let audioCtx = null;
let lastBrowseAt = 0;
const BROWSE_THROTTLE_MS = 72;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Must be awaited before scheduling oscillators; `void resume()` races and often leaves the context suspended → silence. */
export async function resumeSharedAudioContext() {
  try {
    const c = getCtx();
    if (c.state === "suspended") await c.resume();
  } catch {
    /* ignore */
  }
}

/**
 * Rendered/streamed terminal text — **preferred profile:** mild low-mid sine only (no HF noise).
 * ~520–620 Hz → gentle glide down, ~3 ms attack, ~72 ms decay; small random pitch per tick.
 * (Avoid bandpassed white noise here — reads sharp on fast streams.)
 */
export async function playSoftRenderTick() {
  if (!getUiOptions().beep) return;
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.52;
    master.connect(c.destination);

    const o = c.createOscillator();
    o.type = "sine";
    const f0 = 520 + Math.random() * 100;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(440 + Math.random() * 45, t0 + 0.028);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.055, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.072);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + 0.08);
  } catch {
    /* ignore */
  }
}

let cachedNoiseBuffer = null;

function getShortNoiseBuffer(ctx) {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const dur = 0.024;
  const rate = ctx.sampleRate;
  const n = Math.max(1, Math.round(rate * dur));
  const buf = ctx.createBuffer(1, n, rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) {
    d[i] = (Math.random() * 2 - 1) * 0.92;
  }
  cachedNoiseBuffer = buf;
  return buf;
}

/**
 * Shell keypress — 100% Web Audio (no MP3/WAV decode). Reliable in Chrome after AudioContext.resume().
 * @param {"char"|"delete"} kind
 */
export function playTypingKeySound(kind = "char") {
  if (!getUiOptions().beep) return;
  void resumeSharedAudioContext().then(() => {
    try {
      const c = getCtx();
      const t0 = c.currentTime;
      const master = c.createGain();
      master.gain.value = 1;
      master.connect(c.destination);

      const del = kind === "delete";
      const fCenter = del ? 380 + Math.random() * 120 : 1200 + Math.random() * 700;

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = fCenter;
      bp.Q.value = 1.15;

      const src = c.createBufferSource();
      src.buffer = getShortNoiseBuffer(c);
      const gN = c.createGain();
      gN.gain.setValueAtTime(0, t0);
      gN.gain.linearRampToValueAtTime(del ? 0.42 : 0.32, t0 + 0.001);
      gN.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);
      src.connect(gN);
      gN.connect(bp);
      bp.connect(master);

      const o = c.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(del ? 620 + Math.random() * 80 : 2100 + Math.random() * 500, t0);
      const gO = c.createGain();
      gO.gain.setValueAtTime(0, t0);
      gO.gain.linearRampToValueAtTime(del ? 0.06 : 0.055, t0 + 0.0004);
      gO.gain.exponentialRampToValueAtTime(0.001, t0 + 0.011);
      o.connect(gO);
      gO.connect(master);

      src.start(t0);
      src.stop(t0 + 0.026);
      o.start(t0);
      o.stop(t0 + 0.015);
    } catch {
      /* ignore */
    }
  });
}

/** Synth presets when WAV is absent or fails to load/play */
function playSynthFallback(kind) {
  const c = getCtx();
  void resumeSharedAudioContext().then(() => {
    const t0 = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.12;
  master.connect(c.destination);

  if (kind === "select") {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(1180, t0);
    o.frequency.exponentialRampToValueAtTime(880, t0 + 0.045);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + 0.07);
    return;
  }
  if (kind === "browse") {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + 0.06);
    return;
  }
  // click
  const o1 = c.createOscillator();
  o1.type = "square";
  o1.frequency.setValueAtTime(1850, t0);
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.4, t0);
  g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);
  o1.connect(g1);
  g1.connect(master);
  o1.start(t0);
  o1.stop(t0 + 0.04);
  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(420, t0 + 0.012);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.15, t0 + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  o2.connect(g2);
  g2.connect(master);
  o2.start(t0 + 0.012);
  o2.stop(t0 + 0.1);
  });
}

async function playUi(kind) {
  if (!getUiOptions().beep) return;
  await resumeSharedAudioContext();
  const url = `${soundBase}/${UI_FILES[kind]}`;
  const a = new Audio(url);
  a.volume = UI_VOL[kind];
  let settled = false;
  const useSynth = () => {
    if (settled) return;
    settled = true;
    playSynthFallback(kind);
  };
  a.addEventListener("error", useSynth, { once: true });
  void a.play().then(
    () => {
      settled = true;
    },
    () => useSynth(),
  );
}

export function playUiSelect() {
  void playUi("select");
}

export function playUiBrowse() {
  if (!getUiOptions().beep) return;
  const now = Date.now();
  if (now - lastBrowseAt < BROWSE_THROTTLE_MS) return;
  lastBrowseAt = now;
  void playUi("browse");
}

export function playUiClick() {
  void playUi("click");
}

/** Resume AudioContext after user gesture (call from prime). */
export function resumeUiAudioContext() {
  void resumeSharedAudioContext();
}

/**
 * Header buttons: subtle browse on focus; click on pointer down (selection confirm).
 */
export function registerChromeUiSounds(root = document) {
  const header = root.querySelector?.(".header-actions") ?? root;
  if (!header) return;

  header.querySelectorAll("button.ghost").forEach((btn) => {
    btn.addEventListener("focus", () => playUiBrowse());
    btn.addEventListener("click", () => playUiClick());
  });

  root.addEventListener(
    "focusin",
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.id === "cmd" && el.matches?.("input")) {
        playUiBrowse();
      }
    },
    true,
  );
}

/** Expose for engine/ui-browser (pager). */
export function installGlobalUiHooks() {
  globalThis.__HKTM_UI_SELECT = playUiSelect;
  globalThis.__HKTM_UI_BROWSE = playUiBrowse;
  globalThis.__HKTM_UI_CLICK = playUiClick;
}
