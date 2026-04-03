import { AnsiUp } from "ansi_up";
import { setLanguage, t } from "../src/i18n.mjs";
import { setUiOptions, waitForEnterContinue, __hktmFlushEnterWaiter } from "../src/ui-browser.mjs";

const ansiUp = new AnsiUp();
ansiUp.use_classes = true;

const termEl = document.getElementById("term");
const termWrap = document.getElementById("term-wrap");
const cmdInput = document.getElementById("cmd");

function playTone(freq = 880, ms = 140, vol = 0.08) {
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain();
    g.gain.value = vol;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, ms);
  } catch {
    /* ignore */
  }
}

globalThis.__HKTM_BEEP = () => playTone(880, 120, 0.07);
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
      termEl.innerHTML += ansiUp.ansi_to_html(String(s));
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
setUiOptions({ mode: "pip", width: 88, typing: false, cps: 24000, beep: true });

async function boot() {
  const { createMissionSession } = await import("../src/engine.mjs");

  const res = await fetch("/missions/m1-ghost-proxy.json");
  if (!res.ok) throw new Error("mission fetch failed");
  const m1 = await res.json();
  const mission = m1;

  const session = createMissionSession(mission);

  await session.printBanner();
  await waitForEnterContinue(t("press_enter_continue"));

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
