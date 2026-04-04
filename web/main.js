import { AnsiUp } from "ansi_up";
import { setLanguage, t } from "../src/i18n.mjs";
import {
  setUiOptions,
  getUiOptions,
  waitForEnterContinue,
  __hktmFlushEnterWaiter,
  handlePagerKeydown,
  setPagerHooks,
} from "../src/ui-browser.mjs";
import {
  installGlobalUiHooks,
  registerChromeUiSounds,
  resumeSharedAudioContext,
  playSoftRenderTick,
  playTypingKeySound,
  playUiClick,
} from "./ui-sounds.mjs";

installGlobalUiHooks();

const ansiUp = new AnsiUp();
ansiUp.use_classes = true;

const termEl = document.getElementById("term");
const termWrap = document.getElementById("term-wrap");
const cmdInput = document.getElementById("cmd");
const inputRowEl = document.querySelector(".input-row");

/** While a pager is open, blur the shell input and focus the terminal so keys are not eaten by <input>. */
if (termWrap) termWrap.tabIndex = -1;
setPagerHooks({
  pause: () => {
    if (cmdInput) {
      cmdInput.readOnly = true;
      cmdInput.blur();
    }
    if (inputRowEl) inputRowEl.style.display = "none";
    termWrap?.focus({ preventScroll: true });
  },
  resume: () => {
    if (cmdInput) cmdInput.readOnly = false;
    if (inputRowEl) inputRowEl.style.display = "flex";
    cmdInput?.focus();
  },
});

let audioPrimed = false;
const soundBase = "/sounds/fallout_terminal";
/** Enter / notification beeps (optional WAVs under soundBase). Typing uses Web Audio in ui-sounds.mjs — no MP3 in Chrome path. */
const enterFiles = ["charenter_01.wav", "charenter_02.wav", "charenter_03.wav"];

const pools = new Map();

function getPool(url, size = 6) {
  const key = `${url}|${size}`;
  const existing = pools.get(key);
  if (existing) return existing;
  const arr = Array.from({ length: size }, () => {
    const a = new Audio(url);
    a.preload = "auto";
    a.volume = 0.3;
    return a;
  });
  pools.set(key, arr);
  return arr;
}

const SOUND_PREF_LS = "hktm_web_sound";

function loadSoundPreference() {
  try {
    const v = localStorage.getItem(SOUND_PREF_LS);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

/** @param {boolean} [bypassMute] when true, play even if UI sound is off (e.g. Test sound) */
async function playFromPool(url, vol = 0.25, bypassMute = false) {
  if (!bypassMute && !getUiOptions().beep) return;
  await resumeSharedAudioContext();
  const pool = getPool(url);
  const a = pool.find((x) => x.paused) ?? pool[0];
  const onErr = () => {
    /* MP3/WAV missing — silent */
  };
  a.addEventListener("error", onErr, { once: true });
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = vol;
    await a.play();
  } catch {
    onErr();
  }
}

function primeAudio() {
  if (audioPrimed) return;
  audioPrimed = true;
  void resumeSharedAudioContext();
  for (const f of enterFiles) {
    getPool(`${soundBase}/${f}`, 2);
  }
}

function armAudioUnlock() {
  for (const ev of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(ev, primeAudio, { once: true, capture: true });
  }
}
armAudioUnlock();

globalThis.__HKTM_PRIME_AUDIO = primeAudio;

/** Engine/UI: spinners/pager silent; rendered typing uses one soft tick (not MP3). */
globalThis.__HKTM_LOADING_TICK = () => {};
globalThis.__HKTM_TYPE = () => {
  void playSoftRenderTick();
};
globalThis.__HKTM_PAGE = () => {};
globalThis.__HKTM_BEEP = () => {
  const f = enterFiles[(Math.random() * enterFiles.length) | 0];
  void playFromPool(`${soundBase}/${f}`, 0.28);
};

cmdInput?.addEventListener(
  "keydown",
  (e) => {
    const k = e.key;
    const printable = k.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
    if (printable) {
      if (e.repeat) return;
      primeAudio();
      playTypingKeySound("char");
    } else if (k === "Backspace" || k === "Delete") {
      primeAudio();
      playTypingKeySound("delete");
    }
  },
  { passive: true },
);

/** Raw stdout after last newline; engine `loading()` uses CR to rewrite one line. */
let stdoutIncomplete = "";
let stdoutLiveEl = null;

/** Snapshots of the terminal HTML before each full-screen clear (scan → probe → …). Alt+PgUp/PgDn browse steps. */
let stepSnapshots = [];
let stepViewMode = "live";
let stepSnapIdx = -1;
let stepBackupLiveHtml = "";

function restoreLiveFromStepHistoryIfNeeded() {
  if (stepViewMode !== "snapshot") return;
  termEl.innerHTML = stepBackupLiveHtml;
  stepViewMode = "live";
  stepSnapIdx = -1;
  stepBackupLiveHtml = "";
  stdoutIncomplete = "";
  removeStdoutLiveLine();
}

function clearTerminalInternal() {
  restoreLiveFromStepHistoryIfNeeded();
  const html = termEl.innerHTML;
  if (html.trim() !== "") {
    stepSnapshots.push(html);
    if (stepSnapshots.length > 40) stepSnapshots.shift();
  }
  stepViewMode = "live";
  stepSnapIdx = -1;
  stepBackupLiveHtml = "";
  termEl.innerHTML = "";
  stdoutIncomplete = "";
  removeStdoutLiveLine();
}

function navigateStepHistoryOlder() {
  if (stepSnapshots.length === 0) return;
  if (stepViewMode === "live") {
    stepBackupLiveHtml = termEl.innerHTML;
    stepViewMode = "snapshot";
    stepSnapIdx = stepSnapshots.length - 1;
    termEl.innerHTML = stepSnapshots[stepSnapIdx];
    stdoutIncomplete = "";
    removeStdoutLiveLine();
    return;
  }
  if (stepSnapIdx > 0) {
    stepSnapIdx -= 1;
    termEl.innerHTML = stepSnapshots[stepSnapIdx];
  }
}

function navigateStepHistoryNewer() {
  if (stepViewMode !== "snapshot") return;
  if (stepSnapIdx < stepSnapshots.length - 1) {
    stepSnapIdx += 1;
    termEl.innerHTML = stepSnapshots[stepSnapIdx];
  } else {
    termEl.innerHTML = stepBackupLiveHtml;
    stepViewMode = "live";
    stepSnapIdx = -1;
    stepBackupLiveHtml = "";
  }
}

function removeStdoutLiveLine() {
  if (stdoutLiveEl) {
    stdoutLiveEl.remove();
    stdoutLiveEl = null;
  }
}

function flushStdoutCompletedLine(lineText) {
  removeStdoutLiveLine();
  const span = document.createElement("span");
  span.className = "hktm-out-line";
  span.innerHTML = ansiUp.ansi_to_html(lineText);
  termEl.appendChild(span);
  termEl.appendChild(document.createElement("br"));
}

function updateStdoutLiveLine(visibleAnsi) {
  const html = ansiUp.ansi_to_html(visibleAnsi);
  if (!stdoutLiveEl) {
    stdoutLiveEl = document.createElement("span");
    stdoutLiveEl.className = "hktm-out-live";
    termEl.appendChild(stdoutLiveEl);
  }
  stdoutLiveEl.innerHTML = html;
}

function browserStdoutWrite(raw) {
  if (stepViewMode === "snapshot") {
    restoreLiveFromStepHistoryIfNeeded();
  }
  let chunk = String(raw);
  if (chunk.includes("\x1b[2J")) {
    clearTerminalInternal();
    chunk = chunk.replace(/\x1b\[2J\x1b\[H/g, "").replace(/\x1b\[2J/g, "").replace(/\x1b\[H/g, "");
  }
  if (!chunk) {
    termWrap.scrollTop = termWrap.scrollHeight;
    return;
  }

  stdoutIncomplete += chunk;

  while (stdoutIncomplete.includes("\n")) {
    const nl = stdoutIncomplete.indexOf("\n");
    let line = stdoutIncomplete.slice(0, nl);
    stdoutIncomplete = stdoutIncomplete.slice(nl + 1);
    if (line.includes("\r")) {
      line = line.slice(line.lastIndexOf("\r") + 1);
    }
    flushStdoutCompletedLine(line);
  }

  let display = stdoutIncomplete;
  if (display.includes("\r")) {
    display = display.slice(display.lastIndexOf("\r") + 1);
  }
  if (display.length === 0) {
    removeStdoutLiveLine();
  } else {
    updateStdoutLiveLine(display);
  }

  termWrap.scrollTop = termWrap.scrollHeight;
}

globalThis.__HKTM_CLEAR = clearTerminalInternal;

function syncSoundToggleButton() {
  const btn = document.getElementById("sound-toggle");
  if (!btn) return;
  const on = getUiOptions().beep;
  btn.textContent = on ? "Sound on" : "Sound off";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.classList.toggle("sound-off", !on);
}

registerChromeUiSounds(document);

document.getElementById("sound-toggle")?.addEventListener("click", () => {
  const next = !getUiOptions().beep;
  setUiOptions({ beep: next });
  try {
    localStorage.setItem(SOUND_PREF_LS, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  syncSoundToggleButton();
  primeAudio();
});

document.getElementById("beep-test")?.addEventListener("click", () => {
  primeAudio();
  void playFromPool(`${soundBase}/${enterFiles[0]}`, 0.12, true);
});

globalThis.process = {
  env: { HKTM_WEB: "1" },
  stdout: {
    isTTY: true,
    columns: 100,
    rows: 40,
    write: browserStdoutWrite,
  },
  stdin: {
    isTTY: true,
    ref() {},
    unref() {},
    setRawMode() {},
    on() {},
    removeListener() {},
  },
  stderr: { write: (s) => process.stdout.write(s) },
};

console.log = (...args) => {
  process.stdout.write(`${args.map(String).join(" ")}\n`);
};

/** Pager + splash Enter: capture on window runs before bubbling to #cmd. */
window.addEventListener(
  "keydown",
  (e) => {
    if (handlePagerKeydown(e)) return;

    const k = e.key;
    const code = e.code || "";
    const pageDown = k === "PageDown" || code === "PageDown" || e.keyCode === 34;
    const pageUp = k === "PageUp" || code === "PageUp" || e.keyCode === 33;

    if (e.altKey && !e.ctrlKey && !e.metaKey && (pageUp || pageDown)) {
      e.preventDefault();
      if (pageUp) navigateStepHistoryOlder();
      else navigateStepHistoryNewer();
      return;
    }

    if (termWrap && (pageDown || pageUp) && termWrap.scrollHeight > termWrap.clientHeight) {
      const t = e.target;
      const scrollOk =
        t === cmdInput ||
        t === termWrap ||
        (t instanceof Node && termWrap.contains(t));
      if (scrollOk) {
        e.preventDefault();
        const step = Math.round(termWrap.clientHeight * 0.88);
        termWrap.scrollBy({ top: pageDown ? step : -step, behavior: "auto" });
        return;
      }
    }

    if (e.target === cmdInput) return;
    if (e.key === "Enter") {
      const t = e.target;
      if (t instanceof HTMLButtonElement && t.closest?.(".header-actions")) return;
      e.preventDefault();
      playUiClick();
      __hktmFlushEnterWaiter();
    }
  },
  { capture: true, passive: false },
);

setLanguage("en");
setUiOptions({
  mode: "pip",
  width: 88,
  typing: true,
  cps: 2200,
  beep: loadSoundPreference(),
});
syncSoundToggleButton();

/** Match game.mjs `shouldClearScreen`: clear terminal before known commands (full-screen feel). */
function shouldClearMissionWeb(line) {
  const t = line.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  const campaignExact = new Set([
    "ui pip",
    "ui plain",
    "typing on",
    "typing off",
    "beep on",
    "beep off",
    "reset",
    "tutorial",
    "tutorial on",
    "tutorial off",
    "quit",
    "campaign",
    "retry",
  ]);
  if (campaignExact.has(lower)) return true;
  const [a] = lower.split(/\s+/);
  const mission = new Set([
    "help",
    "clear",
    "status",
    "map",
    "scan",
    "probe",
    "connect",
    "enum",
    "exploit",
    "info",
    "stash",
    "ls",
    "cat",
    "exfil",
    "cover",
    "spoof",
    "laylow",
    "sql",
    "submit",
    "tutorial",
    "quit",
  ]);
  return mission.has(a);
}

async function boot() {
  const { createMissionSession } = await import("../src/engine.mjs");

  const res = await fetch(`/missions/m1-ghost-proxy.json?v=${encodeURIComponent(String(Date.now()))}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("mission fetch failed");
  const m1 = await res.json();
  const mission = m1;

  const session = createMissionSession(mission);

  globalThis.__HKTM_CLEAR();

  // Hide input row during initial "Press Enter to continue" so it matches the CLI boot.
  const inputRow = document.querySelector(".input-row");
  if (inputRow) inputRow.style.display = "none";

  await session.printBanner();
  await waitForEnterContinue(t("press_enter_continue"));
  primeAudio();

  if (inputRow) inputRow.style.display = "flex";

  console.log("");
  console.log(toneLine("=== Browser demo: first mission only (save/load uses Node build) ===", "dim"));
  session.showMap();
  session.showStatus();

  cmdInput.focus();

  cmdInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    restoreLiveFromStepHistoryIfNeeded();
    playUiClick();
    const line = cmdInput.value;
    cmdInput.value = "";
    if (shouldClearMissionWeb(line)) {
      globalThis.__HKTM_CLEAR();
    }
    await session.execute(line);
    cmdInput.focus();
  });
}

function toneLine(text, color) {
  const c = { dim: "\x1b[2m", cyan: "\x1b[36m", green: "\x1b[32m" };
  const r = "\x1b[0m";
  return `${c[color] ?? ""}${text}${r}`;
}

boot().catch((err) => {
  console.error(err);
  termEl.textContent += `\n[boot error] ${err.message}\n`;
});
