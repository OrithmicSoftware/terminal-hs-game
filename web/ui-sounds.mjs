/**
 * Fallout-style terminal UI sounds: selection (move), browsing (focus/tab), click (confirm).
 * Optional WAVs: place ui_select.wav, ui_browse.wav, ui_click.wav under /sounds/fallout_terminal/
 * (e.g. from your own capture of Bethesda’s Fallout terminal SFX — do not redistribute copyrighted audio).
 * If files are missing, short Web Audio synth fallbacks play instead.
 */
import { getUiOptions, setUiOptions } from "../src/ui-browser.mjs";
import { animateEventLabel } from "../src/sound-test.mjs";
import { tone } from "../src/colors-browser.mjs";
import { animSleep } from "../src/anim-sleep-core.mjs";

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
 * Rendered/streamed terminal text — soft irregular HDD-style crunch (low thump + bandpassed noise + tiny tick).
 * Kept quieter than early builds so long sessions don’t fatigue; timing/gain jitter adds irregularity.
 */
export async function playSoftRenderTick() {
  if (!getUiOptions().beep) return;
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.24;
    master.connect(c.destination);
    scheduleHddReadBlip(c, t0, master, {
      noiseCenter: 520 + Math.random() * 90,
      thumpStart: 118 + Math.random() * 20,
      noiseLen: 0.017,
      noiseGain: 0.062,
      thumpGain: 0.068,
      tickHz: 1880 + Math.random() * 280,
    });
  } catch {
    /* ignore */
  }
}

/** Min gap between loading-bar HDD ticks — higher = sparser, less “buzzy”. */
const HKTM_LOADING_TICK_MIN_MS = 152;
let lastHktmLoadingSpinnerAt = 0;

/**
 * Spinner frames during `loading()` for probe / enum / exploit — distinct timbres, throttled so the bar doesn’t buzz.
 */
export function playLoadingSpinnerTick(kind) {
  if (!getUiOptions().beep) return;
  const now = Date.now();
  if (now - lastHktmLoadingSpinnerAt < HKTM_LOADING_TICK_MIN_MS) return;
  lastHktmLoadingSpinnerAt = now;
  void playLoadingSpinnerTickInner(kind);
}

async function playLoadingSpinnerTickInner(kind) {
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.22;
    master.connect(c.destination);

    if (kind === "probe") {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 820 + Math.random() * 120,
        thumpStart: 162 + Math.random() * 26,
        noiseLen: 0.026,
        noiseGain: 0.072,
        thumpGain: 0.074,
        tickHz: 2320 + Math.random() * 340,
      });
    } else if (kind === "enum") {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 600 + Math.random() * 105,
        thumpStart: 138 + Math.random() * 24,
        noiseLen: 0.024,
        noiseGain: 0.068,
        thumpGain: 0.072,
        tickHz: 1980 + Math.random() * 380,
      });
    } else {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 395 + Math.random() * 88,
        thumpStart: 102 + Math.random() * 22,
        noiseLen: 0.028,
        noiseGain: 0.076,
        thumpGain: 0.078,
        tickHz: 1620 + Math.random() * 300,
      });
    }
  } catch {
    /* ignore */
  }
}

/** Min gap between stdout streaming ticks — higher = softer perceived rhythm. */
const HKTM_OUTPUT_RENDER_MIN_MS = 112;
let lastHktmOutputRenderAt = 0;

/**
 * Soft ticks while probe/enum/exploit stdout streams (one throttled blip per completed line / burst).
 */
export function playOutputRenderTick(kind) {
  if (!getUiOptions().beep) return;
  const now = Date.now();
  if (now - lastHktmOutputRenderAt < HKTM_OUTPUT_RENDER_MIN_MS) return;
  lastHktmOutputRenderAt = now;
  void playOutputRenderTickInner(kind);
}

/**
 * Streamed stdout lines (probe/enum/exploit): HDD-style access blip; kind shifts noise/thump bands.
 */
async function playOutputRenderTickInner(kind) {
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.2;
    master.connect(c.destination);

    if (kind === "probe") {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 700 + Math.random() * 115,
        thumpStart: 152 + Math.random() * 24,
        noiseLen: 0.022,
        noiseGain: 0.065,
        thumpGain: 0.068,
        tickHz: 2180 + Math.random() * 320,
      });
    } else if (kind === "enum") {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 560 + Math.random() * 98,
        thumpStart: 134 + Math.random() * 22,
        noiseLen: 0.021,
        noiseGain: 0.063,
        thumpGain: 0.066,
        tickHz: 1880 + Math.random() * 340,
      });
    } else {
      scheduleHddReadBlip(c, t0, master, {
        noiseCenter: 375 + Math.random() * 85,
        thumpStart: 98 + Math.random() * 20,
        noiseLen: 0.025,
        noiseGain: 0.07,
        thumpGain: 0.072,
        tickHz: 1560 + Math.random() * 280,
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Short mechanical drive read: triangle seek thump + bandpassed noise (platter/resonance) + tiny sine tick.
 * @param {AudioContext} c
 * @param {number} t0
 * @param {AudioNode} master output bus (gain node already connected to destination)
 * @param {{ noiseCenter: number, thumpStart: number, noiseLen?: number, noiseGain?: number, thumpGain?: number, tickHz?: number }} opts
 */
function scheduleHddReadBlip(c, t0, master, opts) {
  /** Sub-ms jitter so successive read/write blips don’t lock to a metronome. */
  const t = t0 + Math.random() * 0.0026;
  /** Per-blip level drift — soft, irregular “disk activity” feel. */
  const level = 0.55 + Math.random() * 0.38;
  const noiseCenter = opts.noiseCenter * (0.94 + Math.random() * 0.12);
  const thumpStart = opts.thumpStart;
  const thumpEnd = Math.max(52, thumpStart * 0.4 + Math.random() * 11);
  const noiseLen = opts.noiseLen ?? 0.028;
  const noiseGain = (opts.noiseGain ?? 0.09) * level;
  const thumpGain = (opts.thumpGain ?? 0.095) * level;
  const tickHz = (opts.tickHz ?? 2000 + Math.random() * 400) * (0.91 + Math.random() * 0.14);

  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(master);

  const th = c.createOscillator();
  th.type = "triangle";
  th.frequency.setValueAtTime(thumpStart, t);
  th.frequency.exponentialRampToValueAtTime(thumpEnd, t + 0.022);
  const gTh = c.createGain();
  gTh.gain.setValueAtTime(0, t);
  gTh.gain.linearRampToValueAtTime(thumpGain, t + 0.0014);
  gTh.gain.exponentialRampToValueAtTime(0.001, t + 0.048);
  th.connect(gTh);
  gTh.connect(bus);
  th.start(t);
  th.stop(t + 0.052);

  const src = c.createBufferSource();
  src.buffer = getShortNoiseBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = noiseCenter;
  bp.Q.value = 0.62;
  const gN = c.createGain();
  gN.gain.setValueAtTime(0, t);
  gN.gain.linearRampToValueAtTime(noiseGain, t + 0.0018);
  gN.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
  src.connect(gN);
  gN.connect(bp);
  bp.connect(bus);
  src.start(t);
  src.stop(t + noiseLen + 0.006);

  const tick = c.createOscillator();
  tick.type = "sine";
  tick.frequency.value = tickHz;
  const gTk = c.createGain();
  const tickAmp = (0.007 + Math.random() * 0.006) * level;
  gTk.gain.setValueAtTime(0, t);
  gTk.gain.linearRampToValueAtTime(tickAmp, t + 0.0007);
  gTk.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3400;
  tick.connect(lp);
  lp.connect(gTk);
  gTk.connect(bus);
  tick.start(t);
  tick.stop(t + 0.016);
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

/**
 * SOC / trace pressure — rising pulses + short noise stab (new alert or escalation).
 * Await resume so oscillators are not scheduled while AudioContext is still suspended (void .then races → silence).
 */
export async function playAlarmRiseSound() {
  if (!getUiOptions().beep) return;
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.44;
    master.connect(c.destination);

    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100 + Math.random() * 200;
    bp.Q.value = 0.85;
    const src = c.createBufferSource();
    src.buffer = getShortNoiseBuffer(c);
    const gN = c.createGain();
    gN.gain.setValueAtTime(0, t0);
    gN.gain.linearRampToValueAtTime(0.22, t0 + 0.002);
    gN.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
    src.connect(gN);
    gN.connect(bp);
    bp.connect(master);
    src.start(t0);
    src.stop(t0 + 0.075);

    const freqs = [500, 720, 960];
    const starts = [0.045, 0.13, 0.23];
    for (let i = 0; i < freqs.length; i += 1) {
      const t = t0 + starts[i];
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(freqs[i], t);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.052, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.08);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Trace / heat cooling — soft descending sine pair (cover, spoof, laylow).
 */
export async function playAlarmReduceSound() {
  if (!getUiOptions().beep) return;
  try {
    await resumeSharedAudioContext();
    const c = getCtx();
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.4;
    master.connect(c.destination);

    const o1 = c.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(760 + Math.random() * 40, t0);
    o1.frequency.exponentialRampToValueAtTime(500, t0 + 0.2);
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0, t0);
    g1.gain.linearRampToValueAtTime(0.055, t0 + 0.004);
    g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    o1.connect(g1);
    g1.connect(master);
    o1.start(t0);
    o1.stop(t0 + 0.3);

    const o2 = c.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(520, t0 + 0.2);
    o2.frequency.exponentialRampToValueAtTime(340, t0 + 0.46);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, t0 + 0.2);
    g2.gain.linearRampToValueAtTime(0.042, t0 + 0.205);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.52);
    o2.connect(g2);
    g2.connect(master);
    o2.start(t0 + 0.2);
    o2.stop(t0 + 0.55);
  } catch {
    /* ignore */
  }
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

/**
 * Ghost chat drawer — short “sheet” swipe (synth; optional WAVs can be added later like other UI sounds).
 * Open: rising pitch + bandpassed noise; close: falling pitch + noise.
 */
export function playChatSwipeOpen() {
  if (!getUiOptions().beep) return;
  void resumeSharedAudioContext().then(() => {
    try {
      const c = getCtx();
      const t0 = c.currentTime;
      const master = c.createGain();
      master.gain.value = 0.42;
      master.connect(c.destination);

      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t0);
      o.frequency.exponentialRampToValueAtTime(920, t0 + 0.1);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.1, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.115);

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.88;
      bp.frequency.setValueAtTime(360, t0);
      bp.frequency.exponentialRampToValueAtTime(1680, t0 + 0.095);
      const src = c.createBufferSource();
      src.buffer = getShortNoiseBuffer(c);
      const gN = c.createGain();
      gN.gain.setValueAtTime(0, t0);
      gN.gain.linearRampToValueAtTime(0.055, t0 + 0.003);
      gN.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
      src.connect(gN);
      gN.connect(bp);
      bp.connect(master);
      src.start(t0);
      src.stop(t0 + 0.108);
    } catch {
      /* ignore */
    }
  });
}

export function playChatSwipeClose() {
  if (!getUiOptions().beep) return;
  void resumeSharedAudioContext().then(() => {
    try {
      const c = getCtx();
      const t0 = c.currentTime;
      const master = c.createGain();
      master.gain.value = 0.4;
      master.connect(c.destination);

      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(880, t0);
      o.frequency.exponentialRampToValueAtTime(200, t0 + 0.085);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.095);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.1);

      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.88;
      bp.frequency.setValueAtTime(1500, t0);
      bp.frequency.exponentialRampToValueAtTime(320, t0 + 0.088);
      const src = c.createBufferSource();
      src.buffer = getShortNoiseBuffer(c);
      const gN = c.createGain();
      gN.gain.setValueAtTime(0, t0);
      gN.gain.linearRampToValueAtTime(0.048, t0 + 0.002);
      gN.gain.exponentialRampToValueAtTime(0.001, t0 + 0.092);
      src.connect(gN);
      gN.connect(bp);
      bp.connect(master);
      src.start(t0);
      src.stop(t0 + 0.095);
    } catch {
      /* ignore */
    }
  });
}

/** Resume AudioContext after user gesture (call from prime). */
export function resumeUiAudioContext() {
  void resumeSharedAudioContext();
}

/**
 * Header `.header-actions button.ghost`:
 * - `data-hktm-chrome-own-sound` — skip generic browse (focus) and skip generic click; the control
 *   plays its own SFX in a dedicated handler (e.g. chat swipe, SFX toggle blip, reset/fs/CRT in main.js).
 * - `data-hktm-chrome-activation-sound` — skip browse on focus (avoids browse+click merge on mouse);
 *   play generic ui_select (keyboard, detail 0) / ui_click (mouse) unless `own-sound` is set.
 */
export function registerChromeUiSounds(root = document) {
  const header = root.querySelector?.(".header-actions") ?? root;
  if (!header) return;

  header.querySelectorAll("button.ghost").forEach((btn) => {
    btn.addEventListener("focus", () => {
      if (btn.hasAttribute("data-hktm-chrome-own-sound")) return;
      if (btn.hasAttribute("data-hktm-chrome-activation-sound")) return;
      playUiBrowse();
    });
    btn.addEventListener("click", (e) => {
      if (btn.hasAttribute("data-hktm-chrome-own-sound")) return;
      if (!btn.hasAttribute("data-hktm-chrome-activation-sound")) return;
      if (e.detail === 0) playUiSelect();
      else playUiClick();
    });
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

/**
 * Full web audio audition (`test sound`): typewriter label, then the matching sample.
 * Temporarily forces sound on so the check works even when muted.
 */
export async function runTerminalSoundSelfTest() {
  await resumeSharedAudioContext();
  globalThis.__HKTM_PRIME_AUDIO?.();
  const prev = getUiOptions().beep;
  setUiOptions({ beep: true });
  try {
    console.log(tone("Auditioning UI audio — unmuted for this run.", "dim"));
    const steps = [
      {
        label: "loading_tick.probe",
        play: () => {
          globalThis.__HKTM_LOADING_TICK_KIND = "probe";
          globalThis.__HKTM_LOADING_TICK?.();
          delete globalThis.__HKTM_LOADING_TICK_KIND;
        },
      },
      {
        label: "loading_tick.enum",
        play: () => {
          globalThis.__HKTM_LOADING_TICK_KIND = "enum";
          globalThis.__HKTM_LOADING_TICK?.();
          delete globalThis.__HKTM_LOADING_TICK_KIND;
        },
      },
      {
        label: "loading_tick.exploit",
        play: () => {
          globalThis.__HKTM_LOADING_TICK_KIND = "exploit";
          globalThis.__HKTM_LOADING_TICK?.();
          delete globalThis.__HKTM_LOADING_TICK_KIND;
        },
      },
      { label: "output_render.probe", play: () => playOutputRenderTick("probe") },
      { label: "output_render.enum", play: () => playOutputRenderTick("enum") },
      { label: "output_render.exploit", play: () => playOutputRenderTick("exploit") },
      { label: "soft_render", play: () => playSoftRenderTick() },
      { label: "typing_key.char", play: () => playTypingKeySound("char") },
      { label: "typing_key.delete", play: () => playTypingKeySound("delete") },
      { label: "ui_select", play: () => playUiSelect() },
      { label: "ui_browse", play: () => playUiBrowse() },
      { label: "ui_click", play: () => playUiClick() },
      { label: "alarm_rise", play: () => playAlarmRiseSound() },
      { label: "alarm_reduce", play: () => playAlarmReduceSound() },
      { label: "chat_swipe_open", play: () => playChatSwipeOpen() },
      { label: "chat_swipe_close", play: () => playChatSwipeClose() },
      { label: "enter_beep", play: () => globalThis.__HKTM_BEEP?.() },
    ];
    for (const { label, play } of steps) {
      await animateEventLabel(label);
      await Promise.resolve(play());
      await animSleep(220);
    }
    console.log(tone("Done.", "dim"));
  } finally {
    setUiOptions({ beep: prev });
  }
}
