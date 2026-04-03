import { AnsiUp } from "ansi_up";
import { setLanguage, t } from "../src/i18n.mjs";
import { setUiOptions, waitForEnterContinue, __hktmFlushEnterWaiter } from "../src/ui-browser.mjs";

const ansiUp = new AnsiUp();
ansiUp.use_classes = true;

const termEl = document.getElementById("term");
const termWrap = document.getElementById("term-wrap");
const cmdInput = document.getElementById("cmd");

let audioPrimed = false;
const soundBase = "/sounds/fallout_terminal";
const typingFiles = ["01.wav", "02.wav", "03.wav", "04.wav", "05.wav", "06.wav"];
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

function playFromPool(url, vol = 0.25) {
  const pool = getPool(url);
  // pick a paused audio or recycle the oldest
  const a = pool.find((x) => x.paused) ?? pool[0];
  try {
    a.pause();
    a.currentTime = 0;
    a.volume = vol;
    void a.play();
  } catch {
    /* ignore */
  }
}

function primeAudio() {
  if (audioPrimed) return;
  audioPrimed = true;
  // Preload by touching Audio objects; first user gesture will allow play().
  for (const f of [...typingFiles, ...enterFiles]) {
    getPool(`${soundBase}/${f}`, 2);
  }
}

window.addEventListener("pointerdown", primeAudio, { once: true });
window.addEventListener("keydown", primeAudio, { once: true });

globalThis.__HKTM_TYPE = () => {
  const f = typingFiles[(Math.random() * typingFiles.length) | 0];
  playFromPool(`${soundBase}/${f}`, 0.22);
};
globalThis.__HKTM_BEEP = () => {
  const f = enterFiles[(Math.random() * enterFiles.length) | 0];
  playFromPool(`${soundBase}/${f}`, 0.28);
};
globalThis.__HKTM_PAGE = () => {
  const f = typingFiles[(Math.random() * typingFiles.length) | 0];
  playFromPool(`${soundBase}/${f}`, 0.12);
};
globalThis.__HKTM_CLEAR = () => {
  termEl.innerHTML = "";
};

document.getElementById("beep-test")?.addEventListener("click", () => {
  playTone(660, 180, 0.1);
});

globalThis.process = {
  env: {},
  stdout: {
    isTTY: true,
    columns: 100,
    rows: 40,
    write(s) {
      let chunk = String(s);
      if (chunk.includes("\x1b[2J")) {
        termEl.innerHTML = "";
        chunk = chunk.replace(/\x1b\[2J\x1b\[H/g, "").replace(/\x1b\[2J/g, "").replace(/\x1b\[H/g, "");
      }
      termEl.innerHTML += ansiUp.ansi_to_html(chunk);
      termWrap.scrollTop = termWrap.scrollHeight;
    },
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

window.addEventListener("keydown", (e) => {
  if (e.target === cmdInput) return;
  if (e.key === "Enter") {
    e.preventDefault();
    __hktmFlushEnterWaiter();
  }
});

setLanguage("en");
setUiOptions({ mode: "pip", width: 88, typing: true, cps: 2200, beep: true });

async function boot() {
  const { createMissionSession } = await import("../src/engine.mjs");

  const res = await fetch("/missions/m1-ghost-proxy.json");
  if (!res.ok) throw new Error("mission fetch failed");
  const m1 = await res.json();
  const mission = m1;

  const session = createMissionSession(mission);

  // Hide input row during initial "Press Enter to continue" so it matches the CLI boot.
  const inputRow = document.querySelector(".input-row");
  if (inputRow) inputRow.style.display = "none";

  await session.printBanner();
  await waitForEnterContinue(t("press_enter_continue"));

  if (inputRow) inputRow.style.display = "flex";

  console.log("");
  console.log(toneLine("=== Browser demo: first mission only (save/load uses Node build) ===", "dim"));
  session.showMap();
  session.showStatus();

  cmdInput.focus();

  cmdInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const line = cmdInput.value;
    cmdInput.value = "";
    await session.execute(line);
    if (!session.state.finished) {
      session.showStatus();
    }
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
