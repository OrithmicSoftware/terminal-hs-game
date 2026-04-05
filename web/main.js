import { AnsiUp } from "ansi_up";
import { setLanguage, t } from "../src/i18n.mjs";
import {
  setUiOptions,
  getUiOptions,
  __hktmFlushEnterWaiter,
  __hktmEnterWaitPending,
  __hktmFlushChoiceWaiter,
  __hktmChoiceWaiting,
  handlePagerKeydown,
  setPagerHooks,
  skipTypeRenderRequest,
  isTypeLineRendering,
  isPagerKeyPending,
} from "../src/ui-browser.mjs";
import {
  installGlobalUiHooks,
  registerChromeUiSounds,
  resumeSharedAudioContext,
  playSoftRenderTick,
  playTypingKeySound,
  playUiBrowse,
  playUiClick,
  playUiSelect,
  playAlarmRiseSound,
  playAlarmReduceSound,
  playLoadingSpinnerTick,
  playOutputRenderTick,
  runTerminalSoundSelfTest,
} from "./ui-sounds.mjs";
import { bootBrowserCampaign } from "./campaign-browser.mjs";
import { runIntroSequence, clearOperatorProfileCache } from "./intro-flow.mjs";
import { initGhostChat, clearMissionBriefingCache } from "./ghost-chat.mjs";
import { dismissIncomingMessageHint } from "./terminal-loading.mjs";
import { requestAnimTurbo } from "../src/anim-sleep-core.mjs";

installGlobalUiHooks();

/** Dev: `npm run dev:clear` sets VITE_CLEAR_ON_BOOT=1 — wipe browser storage before first paint. */
function applyClearOnBootIfRequested() {
  try {
    if (import.meta.env.VITE_CLEAR_ON_BOOT !== "1") return;
    localStorage.removeItem("hktm_campaign_save");
    localStorage.removeItem("hktm_operator_profile");
    localStorage.removeItem("hktm_web_sound");
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  clearOperatorProfileCache();
  clearMissionBriefingCache();
}
applyClearOnBootIfRequested();

globalThis.__HKTM_DISMISS_CHAT_HINT = dismissIncomingMessageHint;

const ansiUp = new AnsiUp();
ansiUp.use_classes = true;

const termEl = document.getElementById("term");
const termWrap = document.getElementById("term-wrap");
const cmdInput = document.getElementById("cmd");
const inputRowEl = document.querySelector(".input-row");
const choiceHintEl = document.getElementById("hktm-choice-hint");

globalThis.__HKTM_CHOICE_WAIT_BEGIN = () => {
  choiceHintEl?.removeAttribute("hidden");
};

globalThis.__HKTM_CHOICE_WAIT_END = () => {
  choiceHintEl?.setAttribute("hidden", "");
};

document.querySelectorAll("[data-hktm-choice]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!__hktmChoiceWaiting()) return;
    const n = Number(btn.getAttribute("data-hktm-choice"));
    if (n >= 1 && n <= 3) {
      playUiClick();
      __hktmFlushChoiceWaiter(n);
    }
  });
});

/** Nested pager / choice gates — used to keep the command row hidden while UI output is active. */
let pagerPauseDepth = 0;
/** `waitForEnterContinue` / splash — stack depth so we hide `#cmd` until Enter is consumed. */
let enterWaitDepth = 0;

/** Debounced restore of the prompt after stdout stops (typing animation, streaming lines). */
let stdoutIdleTimer = null;
const STDOUT_IDLE_MS = 11;

/** While a pager is open, blur the shell input and focus the terminal so keys are not eaten by <input>. */
if (termWrap) termWrap.tabIndex = -1;
setPagerHooks({
  pause: () => {
    pagerPauseDepth += 1;
    if (cmdInput) {
      cmdInput.readOnly = true;
      cmdInput.blur();
    }
    if (inputRowEl) inputRowEl.style.display = "none";
    document.getElementById("step-history-prev")?.setAttribute("disabled", "true");
    document.getElementById("step-history-curr")?.setAttribute("disabled", "true");
    document.getElementById("step-history-next")?.setAttribute("disabled", "true");
    termWrap?.focus({ preventScroll: true });
  },
  resume: () => {
    pagerPauseDepth = Math.max(0, pagerPauseDepth - 1);
    syncCommandRowForStepView();
    updateStepHistoryButtons();
    cmdInput?.focus();
  },
});

globalThis.__HKTM_ENTER_WAIT_BEGIN = () => {
  enterWaitDepth += 1;
  if (enterWaitDepth === 1) {
    document.getElementById("step-history-prev")?.setAttribute("disabled", "true");
    document.getElementById("step-history-curr")?.setAttribute("disabled", "true");
    document.getElementById("step-history-next")?.setAttribute("disabled", "true");
    termWrap?.focus({ preventScroll: true });
  }
  syncCommandRowForStepView();
};

globalThis.__HKTM_ENTER_WAIT_END = () => {
  enterWaitDepth = Math.max(0, enterWaitDepth - 1);
  updateStepHistoryButtons();
  syncCommandRowForStepView();
  if (enterWaitDepth === 0 && pagerPauseDepth === 0 && stepViewMode === "live") {
    cmdInput?.focus();
  }
};

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

/** @param {boolean} [bypassMute] when true, play even if UI sound is off (e.g. `test sound` self-test) */
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
globalThis.__HKTM_SOUND_SELF_TEST = runTerminalSoundSelfTest;

/** Engine/UI: probe/enum/exploit spinners use playLoadingSpinnerTick; pager silent. */
globalThis.__HKTM_LOADING_TICK = () => {
  const kind = globalThis.__HKTM_LOADING_TICK_KIND;
  if (!kind) return;
  playLoadingSpinnerTick(kind);
};
globalThis.__HKTM_TYPE = () => {
  void playSoftRenderTick();
};
globalThis.__HKTM_PAGE = () => {};
globalThis.__HKTM_BEEP = () => {
  const f = enterFiles[(Math.random() * enterFiles.length) | 0];
  void playFromPool(`${soundBase}/${f}`, 0.28);
};
/** Engine: SOC alert / escalation (trace pressure). */
globalThis.__HKTM_ALARM_RISE = () => {
  void playAlarmRiseSound();
};
/** Engine: cover / spoof / laylow (trace cooling). */
globalThis.__HKTM_ALARM_REDUCE = () => {
  void playAlarmReduceSound();
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

/** Snapshots of the terminal HTML before each full-screen clear (scan → probe → …). PgUp/PgDn browse steps (Shift+ scrolls). */
let stepSnapshots = [];
let stepViewMode = "live";
let stepSnapIdx = -1;
let stepBackupLiveHtml = "";

/** Sync: must finish before callers read `#term` (e.g. clear → snapshot). */
function syncGlitchMutate(fn) {
  const shell = document.getElementById("hktm-app-shell") ?? document.body;
  shell.classList.add("hktm-glitch-pulse");
  try {
    fn();
  } finally {
    setTimeout(() => shell.classList.remove("hktm-glitch-pulse"), 900);
  }
}

/** Next frame: glitch class first paint, then DOM swap — whole chrome + overlay stay one layer. */
function runStepGlitchMutate(fn) {
  const shell = document.getElementById("hktm-app-shell") ?? document.body;
  shell.classList.add("hktm-glitch-pulse");
  requestAnimationFrame(() => {
    try {
      fn();
    } finally {
      setTimeout(() => shell.classList.remove("hktm-glitch-pulse"), 900);
    }
  });
}

function canStepHistoryOlder() {
  if (stepSnapshots.length === 0) return false;
  if (stepViewMode === "live") return true;
  return stepSnapIdx > 0;
}

function canStepHistoryNewer() {
  return stepViewMode === "snapshot";
}

function updateStepHistoryButtons() {
  const prev = document.getElementById("step-history-prev");
  const curr = document.getElementById("step-history-curr");
  const next = document.getElementById("step-history-next");
  if (!prev || !next) return;
  prev.disabled = !canStepHistoryOlder();
  if (curr) curr.disabled = stepViewMode !== "snapshot";
  next.disabled = !canStepHistoryNewer();
}

/** Command prompt only for the live step; hide while browsing snapshot history, pager/choice, Enter-to-continue, or streaming output. */
function syncCommandRowForStepView() {
  clearTimeout(stdoutIdleTimer);
  stdoutIdleTimer = null;
  if (!inputRowEl) return;
  const cmdEnterBtn = document.getElementById("cmd-enter");
  if (stepViewMode === "snapshot") {
    inputRowEl.style.display = "none";
    cmdInput?.setAttribute("aria-hidden", "true");
    cmdInput?.blur();
    if (cmdInput) cmdInput.readOnly = true;
    if (cmdEnterBtn) cmdEnterBtn.disabled = true;
  } else if (pagerPauseDepth > 0) {
    inputRowEl.style.display = "none";
    cmdInput?.setAttribute("aria-hidden", "true");
    cmdInput?.blur();
    if (cmdInput) cmdInput.readOnly = true;
    if (cmdEnterBtn) cmdEnterBtn.disabled = true;
  } else if (enterWaitDepth > 0) {
    inputRowEl.style.display = "none";
    cmdInput?.setAttribute("aria-hidden", "true");
    cmdInput?.blur();
    if (cmdInput) cmdInput.readOnly = true;
    if (cmdEnterBtn) cmdEnterBtn.disabled = true;
  } else {
    inputRowEl.style.display = "flex";
    cmdInput?.removeAttribute("aria-hidden");
    if (cmdInput) cmdInput.readOnly = false;
    if (cmdEnterBtn) cmdEnterBtn.disabled = false;
  }
}

function scheduleStdoutRenderIdle() {
  clearTimeout(stdoutIdleTimer);
  stdoutIdleTimer = setTimeout(() => {
    stdoutIdleTimer = null;
    syncCommandRowForStepView();
  }, STDOUT_IDLE_MS);
}

globalThis.__HKTM_SYNC_CMD_ROW = syncCommandRowForStepView;

function restoreLiveFromStepHistoryIfNeeded() {
  if (stepViewMode !== "snapshot") return;
  syncGlitchMutate(() => {
    termEl.innerHTML = stepBackupLiveHtml;
    stepViewMode = "live";
    stepSnapIdx = -1;
    stepBackupLiveHtml = "";
    stdoutIncomplete = "";
    removeStdoutLiveLine();
    updateStepHistoryButtons();
    syncCommandRowForStepView();
  });
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
  updateStepHistoryButtons();
  syncCommandRowForStepView();
}

function navigateStepHistoryOlder() {
  if (stepSnapshots.length === 0) return;
  runStepGlitchMutate(() => {
    if (stepViewMode === "live") {
      stepBackupLiveHtml = termEl.innerHTML;
      stepViewMode = "snapshot";
      stepSnapIdx = stepSnapshots.length - 1;
      termEl.innerHTML = stepSnapshots[stepSnapIdx];
      stdoutIncomplete = "";
      removeStdoutLiveLine();
      updateStepHistoryButtons();
      syncCommandRowForStepView();
      return;
    }
    if (stepSnapIdx > 0) {
      stepSnapIdx -= 1;
      termEl.innerHTML = stepSnapshots[stepSnapIdx];
    }
    updateStepHistoryButtons();
    syncCommandRowForStepView();
  });
}

function navigateStepHistoryNewer() {
  if (stepViewMode !== "snapshot") return;
  runStepGlitchMutate(() => {
    if (stepSnapIdx < stepSnapshots.length - 1) {
      stepSnapIdx += 1;
      termEl.innerHTML = stepSnapshots[stepSnapIdx];
    } else {
      termEl.innerHTML = stepBackupLiveHtml;
      stepViewMode = "live";
      stepSnapIdx = -1;
      stepBackupLiveHtml = "";
    }
    updateStepHistoryButtons();
    syncCommandRowForStepView();
    if (stepViewMode === "live") cmdInput?.focus();
  });
}

function removeStdoutLiveLine() {
  if (stdoutLiveEl) {
    stdoutLiveEl.remove();
    stdoutLiveEl = null;
  }
}

function flushStdoutCompletedLine(lineText) {
  removeStdoutLiveLine();
  const renderKind = globalThis.__HKTM_RENDER_SOUND_KIND;
  if (renderKind) playOutputRenderTick(renderKind);
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
    if (termEl) termEl.scrollTop = termEl.scrollHeight;
    scheduleStdoutRenderIdle();
    return;
  }

  if (stepViewMode === "live" && inputRowEl) {
    inputRowEl.style.display = "none";
    if (cmdInput) {
      cmdInput.readOnly = true;
      cmdInput.blur();
    }
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

  if (termEl) termEl.scrollTop = termEl.scrollHeight;
  scheduleStdoutRenderIdle();
}

globalThis.__HKTM_CLEAR = clearTerminalInternal;

/** Wall time from navigation start until the shell has finished initial drawing (typed lines + streamed stdout). */
function showInitialRenderTime() {
  const el = document.getElementById("hktm-render-time");
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.textContent = `rendered in ${Math.round(performance.now())}ms`;
    });
  });
}

/**
 * Wait until typewriter `typeLine` and browser stdout buffer are done (map/status may continue after `bootBrowserCampaign` resolves).
 */
async function waitForTerminalShellIdle() {
  const maxMs = 120_000;
  const t0 = Date.now();
  let stable = 0;
  while (Date.now() - t0 < maxMs) {
    const idle =
      !isTypeLineRendering() && !stdoutLiveEl && stdoutIncomplete === "";
    if (idle) stable += 1;
    else stable = 0;
    if (stable >= 2) {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!isTypeLineRendering() && !stdoutLiveEl && stdoutIncomplete === "") return;
      stable = 0;
    }
    await new Promise((r) => setTimeout(r, 24));
  }
}

function syncSoundToggleButton() {
  const btn = document.getElementById("sound-toggle");
  if (!btn) return;
  const on = getUiOptions().beep;
  btn.querySelector(".hktm-sfx-icon--on")?.toggleAttribute("hidden", !on);
  btn.querySelector(".hktm-sfx-icon--off")?.toggleAttribute("hidden", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.setAttribute("aria-label", on ? "Sound effects on" : "Sound effects muted");
  btn.classList.toggle("sound-off", !on);
}

registerChromeUiSounds(document);

function isDocumentFullscreen() {
  return Boolean(document.fullscreenElement ?? document.webkitFullscreenElement);
}

function syncFullscreenToggleButton() {
  const btn = document.getElementById("hktm-fullscreen-btn");
  if (!btn) return;
  const on = isDocumentFullscreen();
  btn.querySelector(".hktm-fs-icon--enter")?.toggleAttribute("hidden", on);
  btn.querySelector(".hktm-fs-icon--exit")?.toggleAttribute("hidden", !on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
  btn.title = on ? "Exit fullscreen" : "Fullscreen (browser)";
}

function initFullscreenToggle() {
  const btn = document.getElementById("hktm-fullscreen-btn");
  if (!btn) return;
  syncFullscreenToggleButton();
  document.addEventListener("fullscreenchange", syncFullscreenToggleButton);
  document.addEventListener("webkitfullscreenchange", syncFullscreenToggleButton);

  const requestFs = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    return el.webkitRequestFullscreen?.();
  };
  const exitFs = () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    return document.webkitExitFullscreen?.();
  };

  btn.addEventListener("click", async (e) => {
    primeAudio();
    if (e.detail === 0) playUiSelect();
    else playUiClick();
    try {
      if (!isDocumentFullscreen()) {
        await requestFs();
      } else {
        await exitFs();
      }
    } catch {
      /* unsupported or denied */
    }
  });
}
initFullscreenToggle();

function initCampaignResetButton() {
  const btn = document.getElementById("hktm-campaign-reset-btn");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    primeAudio();
    if (e.detail === 0) playUiSelect();
    else playUiClick();
    const fn = globalThis.__HKTM_RESET_CAMPAIGN;
    if (typeof fn === "function") await fn();
  });
}
initCampaignResetButton();

/** CRT display (cool-retro-term–style presets + overlays) — `crt-display.css` */
const CRT_LS = "hktm_crt_";
const CRT_DEFAULT = {
  theme: "green",
  scanlines: true,
  bloom: true,
  grain: false,
  flicker: false,
};

function readCrtPrefs() {
  try {
    const raw = localStorage.getItem(`${CRT_LS}theme`);
    const theme = raw === "amber" || raw === "ibm" ? raw : "green";
    return {
      theme,
      scanlines: localStorage.getItem(`${CRT_LS}scanlines`) !== "0",
      bloom: localStorage.getItem(`${CRT_LS}bloom`) !== "0",
      grain: localStorage.getItem(`${CRT_LS}grain`) === "1",
      flicker: localStorage.getItem(`${CRT_LS}flicker`) === "1",
    };
  } catch {
    return { ...CRT_DEFAULT };
  }
}

function writeCrtPrefs(p) {
  try {
    localStorage.setItem(`${CRT_LS}theme`, p.theme);
    localStorage.setItem(`${CRT_LS}scanlines`, p.scanlines ? "1" : "0");
    localStorage.setItem(`${CRT_LS}bloom`, p.bloom ? "1" : "0");
    localStorage.setItem(`${CRT_LS}grain`, p.grain ? "1" : "0");
    localStorage.setItem(`${CRT_LS}flicker`, p.flicker ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function applyCrtPrefs(p) {
  const root = document.documentElement;
  root.classList.remove("crt-theme-amber", "crt-theme-ibm");
  if (p.theme === "amber") root.classList.add("crt-theme-amber");
  if (p.theme === "ibm") root.classList.add("crt-theme-ibm");
  root.classList.toggle("crt-fx-scanlines", p.scanlines);
  root.classList.toggle("crt-fx-bloom", p.bloom);
  root.classList.toggle("crt-fx-grain", p.grain);
  root.classList.toggle("crt-fx-flicker", p.flicker);
}

function syncCrtFormFromPrefs(p) {
  const themeEl = document.getElementById("hktm-crt-theme");
  if (themeEl) themeEl.value = p.theme;
  const map = [
    ["hktm-crt-scanlines", p.scanlines],
    ["hktm-crt-bloom", p.bloom],
    ["hktm-crt-grain", p.grain],
    ["hktm-crt-flicker", p.flicker],
  ];
  for (const [id, on] of map) {
    const el = document.getElementById(id);
    if (el) el.checked = on;
  }
}

function initCrtDisplay() {
  const prefs = readCrtPrefs();
  applyCrtPrefs(prefs);
  syncCrtFormFromPrefs(prefs);

  const dlg = document.getElementById("hktm-crt-dialog");
  const openBtn = document.getElementById("crt-display-btn");
  openBtn?.addEventListener("click", (e) => {
    syncCrtFormFromPrefs(readCrtPrefs());
    primeAudio();
    if (e.detail === 0) playUiSelect();
    else playUiClick();
    dlg?.showModal();
  });

  document.getElementById("hktm-crt-close")?.addEventListener("click", () => {
    dlg?.close();
  });

  document.getElementById("hktm-crt-reset")?.addEventListener("click", () => {
    writeCrtPrefs(CRT_DEFAULT);
    applyCrtPrefs(CRT_DEFAULT);
    syncCrtFormFromPrefs(CRT_DEFAULT);
    playUiClick();
  });

  function persistFromForm() {
    const themeEl = document.getElementById("hktm-crt-theme");
    const theme =
      themeEl?.value === "amber" || themeEl?.value === "ibm" ? themeEl.value : "green";
    const next = {
      theme,
      scanlines: Boolean(document.getElementById("hktm-crt-scanlines")?.checked),
      bloom: Boolean(document.getElementById("hktm-crt-bloom")?.checked),
      grain: Boolean(document.getElementById("hktm-crt-grain")?.checked),
      flicker: Boolean(document.getElementById("hktm-crt-flicker")?.checked),
    };
    writeCrtPrefs(next);
    applyCrtPrefs(next);
  }

  document.getElementById("hktm-crt-theme")?.addEventListener("change", persistFromForm);
  for (const id of ["hktm-crt-scanlines", "hktm-crt-bloom", "hktm-crt-grain", "hktm-crt-flicker"]) {
    document.getElementById(id)?.addEventListener("change", persistFromForm);
  }
}
initCrtDisplay();

document.querySelectorAll(".step-history-toolbar button.ghost").forEach((btn) => {
  btn.addEventListener("focus", () => playUiBrowse());
});

document.getElementById("step-history-prev")?.addEventListener("click", () => {
  if (!canStepHistoryOlder()) return;
  primeAudio();
  playUiClick();
  navigateStepHistoryOlder();
});

document.getElementById("step-history-next")?.addEventListener("click", () => {
  if (!canStepHistoryNewer()) return;
  primeAudio();
  playUiClick();
  navigateStepHistoryNewer();
});

document.getElementById("step-history-curr")?.addEventListener("click", () => {
  if (stepViewMode !== "snapshot") return;
  primeAudio();
  playUiClick();
  restoreLiveFromStepHistoryIfNeeded();
  cmdInput?.focus();
});

updateStepHistoryButtons();

document.getElementById("sound-toggle")?.addEventListener("click", (e) => {
  primeAudio();
  const prev = getUiOptions().beep;
  const next = !prev;
  const playToggleBlip = () => {
    if (e.detail === 0) playUiSelect();
    else playUiClick();
  };
  if (next) {
    setUiOptions({ beep: true });
    try {
      localStorage.setItem(SOUND_PREF_LS, "1");
    } catch {
      /* ignore */
    }
    syncSoundToggleButton();
    playToggleBlip();
  } else {
    playToggleBlip();
    setUiOptions({ beep: false });
    try {
      localStorage.setItem(SOUND_PREF_LS, "0");
    } catch {
      /* ignore */
    }
    syncSoundToggleButton();
  }
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

/**
 * Space-only turbo: Enter must not arm turbo (submit/readline/pager). Space in chat/intro/codename
 * must not arm turbo while typing; literal spaces in #cmd only turbo when the shell is locked (readOnly).
 */
function shouldArmAnimTurboFromWindowKeydown(e) {
  if (e.key !== " " && e.code !== "Space") return false;
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
  const raw = e.target;
  if (!raw || typeof raw !== "object") return true;
  const el = raw.nodeType === Node.TEXT_NODE ? raw.parentElement : /** @type {Element} */ (raw);
  if (!el?.closest) return true;
  if (el.closest("#hktm-ghost-chat")) return false;
  if (el.closest("#hktm-intro")) return false;
  if (el.closest("#hktm-crt-dialog")) return false;
  if (el.isContentEditable) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    if (el.id === "cmd") return Boolean(el.readOnly);
    return false;
  }
  return true;
}

/** Pager + splash Enter: capture on window runs before bubbling to #cmd. */
window.addEventListener(
  "keydown",
  (e) => {
    const splashEl = document.getElementById("hktm-splash");
    if (splashEl && !splashEl.classList.contains("hktm-hidden")) {
      return;
    }
    if (shouldArmAnimTurboFromWindowKeydown(e)) {
      requestAnimTurbo();
    }
    if (__hktmChoiceWaiting()) {
      const k = e.key;
      const code = e.code || "";
      let n = 0;
      if (k === "1" || k === "2" || k === "3") n = Number(k);
      else if (code === "Numpad1") n = 1;
      else if (code === "Numpad2") n = 2;
      else if (code === "Numpad3") n = 3;
      if (n >= 1 && n <= 3 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        playUiSelect();
        __hktmFlushChoiceWaiter(n);
        return;
      }
    }
    {
      const code = e.code || "";
      const space = e.key === " " || code === "Space";
      const enterSkip =
        (e.key === "Enter" || code === "NumpadEnter") && !e.shiftKey;
      /** `typeLine` depth; also partial stdout (typewriter in flight) when pager is not consuming Space/Enter. */
      const skippableTypewriter =
        isTypeLineRendering() || (stdoutIncomplete !== "" && !isPagerKeyPending());
      if (
        (space || enterSkip) &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        skippableTypewriter
      ) {
        e.preventDefault();
        skipTypeRenderRequest();
        return;
      }
    }
    if (handlePagerKeydown(e)) return;

    const k = e.key;
    const code = e.code || "";
    const pageDown = k === "PageDown" || code === "PageDown" || e.keyCode === 34;
    const pageUp = k === "PageUp" || code === "PageUp" || e.keyCode === 33;

    /* Ctrl/Cmd+arrows: step history. When #cmd is focused with text, keep native word-by-word nav; if the line is empty, Prev/Next still apply. */
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const arrowLeft = k === "ArrowLeft" || code === "ArrowLeft";
      const arrowRight = k === "ArrowRight" || code === "ArrowRight";
      const arrowDown = k === "ArrowDown" || code === "ArrowDown";
      if (arrowLeft || arrowRight || arrowDown) {
        const onCmdLive = e.target === cmdInput && stepViewMode === "live";
        const cmdEmpty = !cmdInput?.value.trim();

        if (arrowLeft && canStepHistoryOlder() && (!onCmdLive || cmdEmpty)) {
          e.preventDefault();
          navigateStepHistoryOlder();
          return;
        }
        if (arrowRight && canStepHistoryNewer() && (!onCmdLive || cmdEmpty)) {
          e.preventDefault();
          navigateStepHistoryNewer();
          return;
        }
        if (arrowDown && stepViewMode === "snapshot") {
          e.preventDefault();
          restoreLiveFromStepHistoryIfNeeded();
          cmdInput?.focus();
          return;
        }
      }
    }

    if (pageUp || pageDown) {
      const forceScroll = e.shiftKey;
      if (!forceScroll && pageUp && canStepHistoryOlder()) {
        e.preventDefault();
        navigateStepHistoryOlder();
        return;
      }
      if (!forceScroll && pageDown && canStepHistoryNewer()) {
        e.preventDefault();
        navigateStepHistoryNewer();
        return;
      }
      if (termEl && termEl.scrollHeight > termEl.clientHeight) {
        const t = e.target;
        const scrollOk =
          t === cmdInput ||
          t === termWrap ||
          t === termEl ||
          (t instanceof Node && termWrap?.contains(t)) ||
          (t instanceof HTMLElement && t.closest?.(".step-history-toolbar"));
        if (scrollOk) {
          e.preventDefault();
          const step = Math.round(termEl.clientHeight * 0.88);
          termEl.scrollBy({ top: pageDown ? step : -step, behavior: "auto" });
          return;
        }
      }
    }

    if (e.key === "Enter" && e.target === cmdInput && __hktmEnterWaitPending()) {
      e.preventDefault();
      playUiSelect();
      __hktmFlushEnterWaiter();
      return;
    }
    if (e.target === cmdInput) return;
    if (e.key === "Enter") {
      const t = e.target;
      if (t instanceof HTMLButtonElement && t.closest?.(".header-actions")) return;
      e.preventDefault();
      playUiSelect();
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
  cps: 4400,
  beep: loadSoundPreference(),
});
syncSoundToggleButton();

globalThis.__HKTM_RESTORE_STEP_HISTORY = restoreLiveFromStepHistoryIfNeeded;

(async () => {
  initGhostChat();
  await runIntroSequence();
  await bootBrowserCampaign();
  await waitForTerminalShellIdle();
  showInitialRenderTime();
})().catch((err) => {
  console.error(err);
  termEl.textContent += `\n[boot error] ${err.message}\n`;
});
