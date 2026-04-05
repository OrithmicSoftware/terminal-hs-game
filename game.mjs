import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "./src/engine.mjs";
import { generateProceduralMissions } from "./src/generator.mjs";
import {
  wrap,
  setUiOptions,
  playTestBeep,
  boxEnterPaged,
  setPagerHooks,
  clearTerminalScreen,
  drainStdinSync,
  waitForEnterContinue,
  waitForEnterContinueRaw,
  setWaitEnterContinueImpl,
  setWaitChoiceImpl,
  logScreenStep,
  logInfoPauseStep,
} from "./src/ui.mjs";
import { tone, highlightCommandHints } from "./src/colors.mjs";
import { setLanguage, t } from "./src/i18n.mjs";
import { createInitialCampaignState, ensureCampaignConsistency } from "./src/campaign-state.mjs";
import { BOOT_RENDER_CPS } from "./src/boot-constants.mjs";
import { getInitialGateMessages } from "./src/client-chat.mjs";
import { resolveContactAlias } from "./src/contact-alias.mjs";
import { runTerminalIntroSequence, runTerminalLoadingSequence } from "./src/terminal-boot-cli.mjs";
import { animSleep } from "./src/anim-sleep-core.mjs";
import { readLineWithGhostDefault } from "./src/terminal-readline-ghost.mjs";
import { CHECKPOINT_IDS, formatCheckpointListForCli } from "./src/checkpoints.mjs";

/** `--checkpoint splash|operator-survey` match cold start (first clear label differs). `--checkpoint kernel-loading` skips splash and lands on faux kernel loading. */
const BOOT_INTRO_CHECKPOINTS = new Set(["splash", "operator-survey", "kernel-loading"]);
import { DEFAULT_OPERATOR_REGION_ID } from "./src/operator-regions.mjs";
import { generateOperatorNickname } from "./src/operator-nickname.mjs";
import { installRuntimeSceneLogFromEnv } from "./src/debug-scene-runtime-log.mjs";
import { logRuntimeAction } from "./src/debug-scene.mjs";

installRuntimeSceneLogFromEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const missionPath = path.join(__dirname, "missions", "m1-ghost-proxy.json");
/** Override for CI / CLI E2E (`test/cli-e2e.test.mjs`). Default: repo-root `campaign-save.json`. */
const campaignSavePath = process.env.HKTM_CAMPAIGN_SAVE_PATH
  ? path.resolve(process.env.HKTM_CAMPAIGN_SAVE_PATH)
  : path.join(__dirname, "campaign-save.json");

function parseCliOptions(argv) {
  /** @type {{ checkpoint: string | null }} */
  const opts = { checkpoint: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] ?? "");
    if (arg === "--checkpoint") {
      const next = String(argv[i + 1] ?? "").trim();
      if (!next) {
        throw new Error(`Missing value for --checkpoint.\n${formatCheckpointListForCli()}`);
      }
      i += 1;
      if (!CHECKPOINT_IDS.has(next)) {
        throw new Error(`Unsupported checkpoint: ${next}\n${formatCheckpointListForCli()}`);
      }
      opts.checkpoint = next;
      continue;
    }
    if (arg.startsWith("--checkpoint=")) {
      const value = arg.slice("--checkpoint=".length).trim();
      if (!value) {
        throw new Error(`Missing value for --checkpoint.\n${formatCheckpointListForCli()}`);
      }
      if (!CHECKPOINT_IDS.has(value)) {
        throw new Error(`Unsupported checkpoint: ${value}\n${formatCheckpointListForCli()}`);
      }
      opts.checkpoint = value;
      continue;
    }
  }
  return opts;
}

const cliOptions = parseCliOptions(process.argv.slice(2));
const startupCheckpoint = cliOptions.checkpoint;
const composeMailCheckpoint = startupCheckpoint === "compose-mail";
const composeMailReadyCheckpoint = startupCheckpoint === "compose-mail-ready";

function clearTerminal(stepName) {
  clearTerminalScreen(stepName);
}

/** Clear before handling input only when the command is recognized (unknown keeps scrollback). */
function shouldClearScreen(line) {
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
    "retry",
    "next",
    "continue",
    "next mission",
  ]);
  if (campaignExact.has(lower)) return true;
  const [a] = lower.split(/\s+/);
  /* `info` logs its own [SCENE … type=log] + pause; skip pre-command clear so HKTM_DEBUG is not noisy. */
  if (a === "info") return false;
  /* Mail spear-phish wizard clears each step with [SCENE … type=form]; sendmail only appears in SMTP logs. */
  if (lower.startsWith("compose mail")) return false;
  if (lower === "mail") return false;
  if (a === "sendmail") return false;
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
    "mail",
    "sendmail",
    "compose",
    "submit",
    "/brief",
    "tutorial",
    "quit",
  ]);
  return mission.has(a);
}

/** Commands for TAB completion (deduped; mission adds connect/scan/exploit paths). */
const STATIC_TAB_COMMANDS = [
  "beep off",
  "beep on",
  "cat",
  "clear",
  "connect",
  "cover",
  "enum",
  "enum --force",
  "enum -f",
  "exfil",
  "exploit",
  "help",
  "info",
  "laylow",
  "ls",
  "map",
  "mail",
  "mail list",
  "mail read",
  "next",
  "continue",
  "next mission",
  "info chat",
  "chat",
  "chat close",
  "/brief",
  "quit",
  "reset",
  "retry",
  "scan",
  "probe",
  "sql",
  "sql demo",
  "sql translate",
  "spoof",
  "stash",
  "status",
  "submit",
  "tutorial",
  "tutorial off",
  "tutorial on",
  "typing off",
  "typing on",
  "ui pip",
  "ui plain",
];

function missionTabCompletions(mission) {
  if (!mission?.nodes?.length) return [];
  const out = [];
  const ids = mission.nodes.map((n) => n.id).sort();
  for (const id of ids) {
    out.push(`connect ${id}`, `probe ${id}`);
  }
  for (const node of mission.nodes) {
    for (const s of node.services ?? []) {
      if (s.exploitId) out.push(`exploit ${s.exploitId}`);
    }
    for (const f of node.files ?? []) {
      if (f.path) {
        out.push(`cat ${f.path}`);
        out.push(`exfil ${f.path}`);
      }
    }
  }
  return out;
}

function createTabCompleter(getMission, getSession) {
  return (line) => {
    const m = getMission();
    const merged = [...STATIC_TAB_COMMANDS, ...missionTabCompletions(m)];
    let uniq = [...new Set(merged)].sort((a, b) => a.localeCompare(b));
    const session = getSession?.();
    if (m?.id === "m1-ghost-proxy" && typeof session?.isTabCommandAllowed === "function") {
      uniq = uniq.filter((cmd) => session.isTabCommandAllowed(cmd));
    }
    const prefix = line.trimStart().toLowerCase();
    const hits = uniq.filter((c) => c.toLowerCase().startsWith(prefix));
    return [hits, line];
  };
}

const handcraftedMission = JSON.parse(fs.readFileSync(missionPath, "utf8"));
const proceduralMissions = generateProceduralMissions(5);
const campaign = [handcraftedMission, ...proceduralMissions];

function loadCampaignState() {
  if (!fs.existsSync(campaignSavePath)) {
    const fresh = createInitialCampaignState(campaign);
    fresh.missions[0].status = "active";
    return fresh;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(campaignSavePath, "utf8"));
    if (!Array.isArray(parsed.missions)) throw new Error("bad save");
    return parsed;
  } catch {
    const fresh = createInitialCampaignState(campaign);
    fresh.missions[0].status = "active";
    return fresh;
  }
}

function saveCampaignState(state) {
  fs.writeFileSync(campaignSavePath, JSON.stringify(state, null, 2), "utf8");
}

function computeFrameWidth(uiMode) {
  const cols =
    typeof process.stdout.columns === "number" && process.stdout.columns > 0
      ? process.stdout.columns
      : 100;
  const usable = Math.max(12, cols - 2);
  if (uiMode === "pip") {
    return Math.min(96, usable);
  }
  return Math.min(100, usable);
}

function applyUi(state) {
  setUiOptions({
    mode: state.uiMode,
    typing: state.typing,
    beep: state.beep,
    width: computeFrameWidth(state.uiMode),
    // ≥20k → full-line turbo in ui.typeLine (snappy mission output; avoids slow per-char boxes).
    cps: state.uiMode === "pip" ? 24000 : 22000,
  });
}

async function runBootRender(state, draw) {
  applyUi(state);
  setUiOptions({ cps: BOOT_RENDER_CPS });
  let pausedForBoot = false;
  try {
    // While readline is active during slow banner typing, Enter can be buffered; on resume the
    // process can look like it "exits" or skip waits. Pause for the whole boot draw.
    if (!rlClosed) {
      rl.pause();
      pausedForBoot = true;
    }
    await draw();
  } finally {
    if (pausedForBoot && !rlClosed) {
      try {
        rl.resume();
      } catch {
        /* ignore */
      }
    }
    applyUi(state);
  }
}

/** After waitForEnterContinue resumes readline, pause again before splash typing (same buffer issue). */
function pauseReadlineForSplashTyping() {
  if (!rlClosed) {
    try {
      rl.pause();
    } catch {
      /* ignore */
    }
  }
}

async function showSplash(state) {
  const contentW = Math.max(40, computeFrameWidth(state.uiMode) - 4);
  const lines = [
    tone(t("terminal_hacksim"), "bold"),
    "",
    ...wrap(t("boot_tagline"), contentW),
    "",
    `${tone(`${t("ui_label")}:`, "magenta")} ${tone(state.uiMode === "pip" ? "PIP" : "PLAIN", "green")}  (${tone("ui pip/plain", "cyan")})`,
    `${tone(`${t("typing_label")}:`, "magenta")} ${state.typing ? tone(t("on"), "green") : tone(t("off"), "yellow")}  (${tone("typing on/off", "cyan")})`,
    `${tone(`${t("beep_label")}:`, "magenta")} ${state.beep ? tone(t("on"), "green") : tone(t("off"), "yellow")}  (${tone("beep on/off", "cyan")})`,
    `${tone(`${t("tutorial_label")}:`, "magenta")} ${state.tutorialEnabled ? tone(t("on"), "green") : tone(t("off"), "yellow")}  (${tone("tutorial on/off", "cyan")})`,
    `${tone(`${t("quit_label")}:`, "magenta")} ${tone("quit", "cyan")}`,
    "",
    ...wrap(t("screen_help"), contentW),
  ];
  console.log("");
  await boxEnterPaged(
    tone(t("boot_title"), "bold"),
    lines,
    computeFrameWidth(state.uiMode),
    t("boot_pager_hint"),
    "boot-splash",
  );
}

function printOperationFooter(state) {
  const cur = campaign[state.currentMissionIndex];
  console.log(`\n${tone(t("current_operation"), "bold")} ${tone(cur.title, "green")}`);
  console.log("");
  console.log(`${tone(">", "dim")} ${t("save_path")}: ${campaignSavePath}`);
  console.log(`${tone(">", "dim")} ${t("controls_line")}`);
}

function printIncomingMessageHint() {
  console.log("");
  console.log(
    `${tone("You have 1 incoming message.", "green")} Type ${tone("chat", "cyan")} to open ${tone("ShadowNet IM", "magenta")}. See ${tone("info chat", "cyan")} for details.`,
  );
  console.log("");
}

function activateMission(state, missionIndex) {
  const mission = campaign[missionIndex];
  const missionState = state.missions[missionIndex];
  missionState.status = missionState.status === "completed" ? "completed" : "active";
  const alias = resolveContactAlias(state.contactAliasSeed);
  globalThis.__HKTM_CONTACT_ALIAS = alias;
  const session = createMissionSession(mission, missionState.snapshot, {
    contactAliasSeed: state.contactAliasSeed,
    missionIndex,
    missionTotal: campaign.length,
    composeMailReadyCheckpoint,
    shadowNetImIntroCompleted: state.shadowNetImIntroCompleted,
    skipM1ToolLock:
      composeMailCheckpoint ||
      composeMailReadyCheckpoint ||
      startupCheckpoint === "mission-shell" ||
      startupCheckpoint === "mission-complete-m1",
    afterInfoRestore: async (runDefaultRestore) => {
      if (!chatGatePending) {
        await runDefaultRestore();
        return;
      }
      // Full clear without a post-splash SCENE line so `prev=` stays on the info pager (e.g. info-chat), not post-splash.
      if (process.stdout.isTTY) {
        clearTerminalScreen();
      } else {
        console.log("\n".repeat(20));
      }
      await runTerminalLoadingSequence({ instant: true });
      printIncomingMessageHint();
    },
  });
  return { mission, session };
}

let campaignState = loadCampaignState();
const schemaBefore = campaignState.schemaVersion;
campaignState = ensureCampaignConsistency(campaignState, campaign);
if (schemaBefore !== campaignState.schemaVersion) {
  saveCampaignState(campaignState);
}
if (startupCheckpoint) {
  // Checkpoints start from a deterministic fresh mission state, independent of any prior save.
  campaignState = createInitialCampaignState(campaign);
  campaignState.missions[0].status = "active";
  campaignState.currentMissionIndex = 0;
  if (startupCheckpoint === "mission-shell" || startupCheckpoint === "chat-gate") {
    campaignState.operatorRegionId = DEFAULT_OPERATOR_REGION_ID;
    campaignState.operatorCodename = generateOperatorNickname();
    campaignState.seenTerminalBoot = true;
  }
  if (startupCheckpoint === "kernel-loading") {
    campaignState.operatorRegionId = DEFAULT_OPERATOR_REGION_ID;
    campaignState.operatorCodename = generateOperatorNickname();
  }
}
setLanguage(campaignState.language);
applyUi(campaignState);

function applyOperatorProfileFromState(state) {
  const cid = String(state?.operatorCodename ?? "").trim();
  const rid = String(state?.operatorRegionId ?? "").trim();
  if (cid && rid) {
    globalThis.__HKTM_PROFILE = { codename: cid, regionId: rid };
  } else {
    globalThis.__HKTM_PROFILE = undefined;
  }
}

applyOperatorProfileFromState(campaignState);
let { mission, session } = activateMission(campaignState, campaignState.currentMissionIndex);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  completer: createTabCompleter(() => mission, () => session),
});

/** When true, the main `rl.on("line")` handler yields to the choice listener. */
let choicePending = false;

setWaitChoiceImpl((footerHint, max = 3) => {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(1);
      return;
    }
    if (footerHint) console.log(tone(footerHint, "dim"));
    choicePending = true;
    const one = (line) => {
      const n = parseInt(String(line).trim(), 10);
      if (n >= 1 && n <= max) {
        choicePending = false;
        try {
          rl.pause();
        } catch {
          /* ignore */
        }
        resolve(n);
      } else {
        console.log(tone(`Invalid — enter a number from 1 to ${max}.`, "yellow"));
        rl.once("line", one);
      }
    };
    try {
      rl.resume();
    } catch {
      /* ignore */
    }
    rl.once("line", one);
  });
});

/** One-shot line capture for operator region/codename (same rl as mission shell). */
let operatorLineResolver = null;

/**
 * Pause readline and wait for Enter in raw mode so Space is not buffered as line input
 * (Space stays available for animation turbo only).
 */
async function waitForBootEnterLine(footerHint = "") {
  await waitForEnterContinueRaw(footerHint, { readlineInterface: rl });
}

function readLineForSetup(prompt) {
  return new Promise((resolve) => {
    operatorLineResolver = (line) => {
      operatorLineResolver = null;
      try {
        rl.pause();
      } catch {
        /* ignore */
      }
      resolve(String(line ?? ""));
    };
    try {
      rl.resume();
    } catch {
      /* ignore */
    }
    rl.setPrompt(prompt ? tone(prompt, "cyan") : tone("> ", "green"));
    rl.prompt();
  });
}

/**
 * Ghost default (gray) + shared readline: pause rl, resume stdin, noop rl._ttyWrite while editing.
 * @param {string} promptPlain
 * @param {string} ghostDefault
 * @param {{ maxLen?: number }} [options]
 */
function readLineForSetupGhost(promptPlain, ghostDefault, options = {}) {
  return readLineWithGhostDefault(promptPlain, ghostDefault, {
    maxLen: options.maxLen ?? 32,
    skipResumeAfterCleanup: options.skipResumeAfterCleanup === true,
    readlineInterface: rl,
    pause: () => {
      try {
        rl.pause();
      } catch {
        /* ignore */
      }
    },
    resume: () => {
      try {
        rl.resume();
      } catch {
        /* ignore */
      }
    },
  });
}

setPagerHooks({
  pause: () => rl.pause(),
  resume: () => rl.resume(),
});

if (process.stdin.isTTY) {
  try {
    process.stdin.ref();
  } catch {
    /* ignore */
  }
}

/** QA: two-pass boot verification (see docs/qa/EXIT-QA.md). Handler: Elliot (new lead). */
if (process.env.HKTM_QA === "1") {
  console.error(
    "\n[HKTM QA | Elliot] Pass 1/2 — prior lead fired; run full boot (Enter twice). Must not hit shell before `>`.\n",
  );
} else if (process.env.HKTM_QA === "2") {
  console.error(
    "\n[HKTM QA | Elliot] Pass 2/2 — cold start again; lonely night shift, log any early exit.\n",
  );
}
if (process.env.HKTM_QA) {
  process.once("beforeExit", (code) => {
    console.error(
      `[HKTM QA | Elliot] beforeExit (code ${code}) — unexpected; attach transcript (EXIT-QA.md).\n`,
    );
  });
}

let appClosing = false;
let rlClosed = false;
/** False until `finishMainShellAndQaHints` — drops stray buffered `line` events during boot (avoids accidental `quit`, etc.). */
let bootComplete = false;

/** When set, `line` events route here (Client gate before handler brief). */
let chatLineConsumer = null;

/** True until the player runs `chat` for the first time on a cold mission-1 start. */
let chatGatePending = false;

rl.on("close", () => {
  rlClosed = true;
});

function persistCurrentSnapshot() {
  campaignState.missions[campaignState.currentMissionIndex].snapshot = session.serialize();
  saveCampaignState(campaignState);
}

async function moveToNextMission() {
  const idx = campaignState.currentMissionIndex;
  const currentMissionState = campaignState.missions[idx];
  currentMissionState.snapshot = session.serialize();

  if (currentMissionState.snapshot.result === "success") {
    currentMissionState.status = "completed";
    if (idx + 1 < campaign.length) {
      campaignState.missions[idx + 1].status =
        campaignState.missions[idx + 1].status === "completed" ? "completed" : "active";
      campaignState.currentMissionIndex = idx + 1;
      ({ mission, session } = activateMission(campaignState, campaignState.currentMissionIndex));
      console.log(`\n${t("next_mission_unlocked")}\n`);
      await runBootRender(campaignState, async () => {
        clearTerminal("next-mission-banner");
        await session.printBanner();
      });
      if (process.stdin.isTTY) {
        drainStdinSync();
        await waitForEnterContinue(t("press_enter_continue"));
      }
      printOperationFooter(campaignState);
    } else {
      console.log(`\n${t("campaign_complete")}`);
      appClosing = true;
      rl.close();
    }
  } else if (currentMissionState.snapshot.result === "failed") {
    currentMissionState.status = "failed";
    console.log(`\n${highlightCommandHints(t("mission_failed_retry"))}`);
  } else if (currentMissionState.snapshot.result === "aborted") {
    console.log(`\n${t("session_aborted")}`);
    appClosing = true;
    rl.close();
  }
  saveCampaignState(campaignState);
}

function shouldRunTerminalClientChatGate() {
  if (startupCheckpoint === "mission-shell" || startupCheckpoint === "mission-complete-m1") return false;
  if (startupCheckpoint === "chat-gate") {
    if (!process.stdin.isTTY) return false;
    if (process.env.HKTM_QA === "1" || process.env.HKTM_QA === "2") return false;
    if (process.env.HKTM_SKIP_CHAT_GATE === "1") return false;
    return true;
  }
  if (startupCheckpoint) return false;
  if (campaignState.currentMissionIndex !== 0) return false;
  if (campaignState.missions[0]?.snapshot) return false;
  if (!process.stdin.isTTY) return false;
  if (process.env.HKTM_QA === "1" || process.env.HKTM_QA === "2") return false;
  if (process.env.HKTM_SKIP_CHAT_GATE === "1") return false;
  return true;
}

/**
 * Browser opens the Client drawer first; terminal mirrors with an inline chat until /exit.
 */
async function maybeTerminalClientChatGate() {
  if (!shouldRunTerminalClientChatGate()) return;
  await runTerminalClientChatGate();
}

function chatTypingDelay() {
  return 600 + Math.random() * 500;
}

async function runTerminalClientChatGate() {
  const codename =
    globalThis.__HKTM_PROFILE?.codename ||
    process.env.HKTM_CODENAME ||
    process.env.USER ||
    "operator";
  const alias = resolveContactAlias(campaignState.contactAliasSeed);
  const [line1, line2] = getInitialGateMessages(codename, alias);
  const tag = alias.tag;
  const w = Math.max(40, computeFrameWidth(campaignState.uiMode) - 4);
  let briefShown = false;
  const typingLabel = t("chat_typing");

  const quickReplies = [
    { key: "1", label: t("chat_reply_1_label"), text: t("chat_reply_1"), response: t("chat_reply_1_response"), used: false },
    { key: "2", label: t("chat_reply_2_label"), text: t("chat_reply_2"), response: t("chat_reply_2_response"), used: false },
    { key: "3", label: t("chat_reply_3_label"), text: t("chat_reply_3"), response: t("chat_reply_3_response"), used: false },
  ];

  function printReplies() {
    console.log("");
    console.log(tone(t("chat_quick_replies_header"), "dim"));
    for (const r of quickReplies) {
      if (r.used) {
        console.log(`  ${tone(r.key, "dim")}  ${tone(r.label, "dim")}`);
      } else {
        console.log(`  ${tone(r.key, "green")}  ${tone(r.label, "cyan")}`);
      }
    }
    console.log(`  ${tone("/brief", "green")}  ${tone("Mission brief", "yellow")}`);
    console.log(`  ${tone("/exit", "green")}  ${tone("Close ShadowNet IM", "dim")}`);
    console.log("");
  }

  const cmdRe = /(\/brief|\/exit|\bmail\b|\binfo phishing\b|\binfo chat\b|\bmail list\b|\bchat\b)/g;
  function chatLine(text) {
    return String(text)
      .split(cmdRe)
      .map((seg, i) => (i % 2 === 1 ? tone(seg, "cyan") : tone(seg, "yellow")))
      .join("");
  }

  async function showTypingIndicator() {
    const prefix = `${tone(`[${tag}]`, "cyan")} `;
    const indicator = `${prefix}${tone(`${typingLabel}...`, "dim")}`;
    if (process.stdout.isTTY) {
      process.stdout.write(indicator);
      await animSleep(chatTypingDelay());
      process.stdout.write("\r\x1b[2K");
    } else {
      console.log(indicator);
      await animSleep(chatTypingDelay());
    }
  }

  async function showTypingThenLine(text, color) {
    const prefix = `${tone(`[${tag}]`, "cyan")} `;
    await showTypingIndicator();
    const colored = color === "chat" ? chatLine(text) : tone(text, color ?? "yellow");
    console.log(`${prefix}${colored}`);
  }

  async function showTypingThenLines(textRows, color) {
    if (!textRows.length) return;
    const prefix = `${tone(`[${tag}]`, "cyan")} `;
    await showTypingIndicator();
    for (const row of textRows) {
      const colored = color === "chat" ? chatLine(row) : tone(row, color ?? "yellow");
      console.log(`${prefix}${colored}`);
    }
  }

  async function printBriefInChat() {
    const prefix = `${tone(`[${tag}]`, "cyan")} `;
    await showTypingIndicator();
    console.log(`${prefix}${chatLine("Uploading brief…")}`);
    await animSleep(400);
    await session.printBanner({ instant: true });
    briefShown = true;
  }

  console.log("");
  console.log(tone(`${tag} — ShadowNet IM`, "bold"));
  console.log("");
  await showTypingThenLine(line1, "chat");
  await showTypingThenLine(line2, "chat");

  printReplies();

  function resumePrompt() {
    if (!rlClosed) {
      rl.setPrompt(tone(`${alias.handlePrompt}> `, "dim"));
      rl.prompt();
    }
  }

  /** Cursor is on the line below the prompt; move up and clear the submitted prompt+input line. */
  function eraseReadlineInputLine() {
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[1A\r\x1b[2K");
    }
  }

  return new Promise((resolve) => {
    function onChatLine(raw) {
      const msg = String(raw ?? "").trim();
      const lower = msg.toLowerCase();

      if (lower === "/exit" || lower === "exit") {
        chatLineConsumer = null;
        void (async () => {
          eraseReadlineInputLine();
          if (briefShown) {
            await showTypingThenLine(
              t("chat_gate_exit_after_brief").replace("%s", alias.signoff),
              "chat",
            );
          } else {
            await showTypingThenLine(
              t("chat_gate_exit_standby").replace("%s", alias.signoff),
              "chat",
            );
          }
          console.log("");
          choicePending = true;
          logInfoPauseStep("chat-gate-exit");
          try {
            drainStdinSync();
            await waitForEnterContinue(t("press_enter_continue"));
          } finally {
            choicePending = false;
          }
          if (process.stdout.isTTY) {
            clearTerminalScreen();
          } else {
            console.log("\n".repeat(20));
          }
          await runTerminalLoadingSequence({ instant: true });
          logScreenStep("mission-brief");
          await session.printBanner({ instant: true, scrollbackBrief: true });
          campaignState.shadowNetImIntroCompleted = true;
          saveCampaignState(campaignState);
          try { rl.setPrompt(""); } catch { /* ignore */ }
          try { rl.pause(); } catch { /* ignore */ }
          resolve();
        })();
        return;
      }

      if (lower === "/brief") {
        chatLineConsumer = null;
        void (async () => {
          eraseReadlineInputLine();
          console.log(`${tone("[YOU]", "magenta")} /brief`);
          await printBriefInChat();
          console.log("");
          await showTypingThenLine(
            `All yours. /exit when you're ready to move. — ${alias.signoff}`,
            "chat",
          );
          printReplies();
          chatLineConsumer = onChatLine;
          resumePrompt();
        })();
        return;
      }

      const quick = quickReplies.find((r) => r.key === msg);
      if (quick) {
        chatLineConsumer = null;
        eraseReadlineInputLine();
        quick.used = true;
        void (async () => {
          if (quick.response) {
            const rows = wrap(quick.response, w);
            await showTypingThenLines(rows, "chat");
          }
          printReplies();
          chatLineConsumer = onChatLine;
          resumePrompt();
        })();
        return;
      }

      if (msg) {
        eraseReadlineInputLine();
        console.log(`${tone("[YOU]", "magenta")} ${msg}`);
      }
      chatLineConsumer = null;
      void (async () => {
        await showTypingThenLine("Copy. ShadowNet IM only — keep trace down.", "dim");
        chatLineConsumer = onChatLine;
        resumePrompt();
      })();
    }

    chatLineConsumer = onChatLine;
    try { rl.resume(); } catch { /* ignore */ }
    rl.setPrompt(tone(`${alias.handlePrompt}> `, "dim"));
    rl.prompt();
  });
}

rl.on("line", async (line) => {
  if (rlClosed) return;
  const inputKind = choicePending ? "choice" : chatLineConsumer ? "chat" : operatorLineResolver ? "operator" : "shell";
  logRuntimeAction(inputKind, String(line ?? ""));
  if (choicePending) return;
  if (operatorLineResolver) {
    const fn = operatorLineResolver;
    operatorLineResolver = null;
    fn(line);
    return;
  }
  if (!bootComplete && !chatLineConsumer) {
    if (!line.trim()) {
      if (!rlClosed) rl.prompt();
      return;
    }
    if (!rlClosed) rl.prompt();
    return;
  }
  if (chatLineConsumer) {
    chatLineConsumer(line);
    return;
  }
  if (shouldClearScreen(line)) {
    clearTerminal("command-clear");
  }
  const trimmed = line.trim().toLowerCase();
  if (trimmed === "ui pip") {
    campaignState.uiMode = "pip";
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("ui_set_pip"));
    await runBootRender(campaignState, async () => {
      clearTerminal("ui-pip-banner");
      await session.printBanner();
    });
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "ui plain") {
    campaignState.uiMode = "plain";
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("ui_set_plain"));
    await runBootRender(campaignState, async () => {
      clearTerminal("ui-plain-banner");
      await session.printBanner();
    });
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "typing on") {
    campaignState.typing = true;
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("typing_on"));
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "typing off") {
    campaignState.typing = false;
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("typing_off"));
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "beep on") {
    campaignState.beep = true;
    applyUi(campaignState);
    saveCampaignState(campaignState);
    playTestBeep();
    console.log(t("beep_on"));
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "beep off") {
    campaignState.beep = false;
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("beep_off"));
    if (!rlClosed) rl.prompt();
    return;
  }

  if (rlClosed) {
    return;
  }

  if (trimmed === "reset") {
    if (fs.existsSync(campaignSavePath)) {
      fs.unlinkSync(campaignSavePath);
    }
    campaignState = createInitialCampaignState(campaign);
    campaignState.missions[0].status = "active";
    applyUi(campaignState);
    saveCampaignState(campaignState);
    ({ mission, session } = activateMission(campaignState, campaignState.currentMissionIndex));
    console.log(`\n${t("campaign_reset")}\n`);
    const resetGate = shouldRunTerminalClientChatGate();
    await runBootRender(campaignState, async () => {
      clearTerminal("reset-intro");
      await runTerminalIntroSequence({
        campaignState,
        save: () => saveCampaignState(campaignState),
        readLine: readLineForSetup,
        readLineGhost: readLineForSetupGhost,
        campaignSavePath,
      });
      applyOperatorProfileFromState(campaignState);
      if (resetGate) {
        printIncomingMessageHint();
      } else {
        clearTerminal("reset-mission-banner");
        await session.printBanner();
      }
    });
    if (resetGate) {
      chatGatePending = true;
    }
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "tutorial on") {
    campaignState.tutorialEnabled = true;
    saveCampaignState(campaignState);
    console.log(t("tutorial_enabled"));
    await session.showTutorialHint?.();
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "tutorial off") {
    campaignState.tutorialEnabled = false;
    saveCampaignState(campaignState);
    console.log(t("tutorial_disabled"));
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "tutorial") {
    if (!campaignState.tutorialEnabled) {
      console.log(t("tutorial_off_hint"));
    } else if (!mission.tutorial?.steps?.length) {
      console.log(t("tutorial_no_steps"));
    } else {
      await session.showTutorialHint?.();
    }
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "quit") {
    campaignState.missions[campaignState.currentMissionIndex].snapshot = session.serialize();
    saveCampaignState(campaignState);
    console.log(`\n${t("campaign_saved_goodbye")}`);
    appClosing = true;
    rl.close();
    return;
  }

  if (trimmed === "retry") {
    campaignState.missions[campaignState.currentMissionIndex].snapshot = null;
    campaignState.missions[campaignState.currentMissionIndex].status = "active";
    ({ mission, session } = activateMission(campaignState, campaignState.currentMissionIndex));
    saveCampaignState(campaignState);
    if (shouldRunTerminalClientChatGate()) {
      chatGatePending = true;
      printIncomingMessageHint();
    } else {
      await runBootRender(campaignState, async () => {
        clearTerminal("retry-banner");
        await session.printBanner();
      });
    }
    if (!rlClosed) rl.prompt();
    return;
  }

  if (session.state.finished) {
    const res = session.state.result;
    if (res === "failed" || res === "aborted") {
      console.log(highlightCommandHints(t("mission_resolved_hint")));
      if (!rlClosed) rl.prompt();
      return;
    }
    if (res === "success") {
      if (trimmed === "next" || trimmed === "continue" || trimmed === "next mission") {
        await moveToNextMission();
        persistCurrentSnapshot();
        if (appClosing) return;
        if (!rlClosed) rl.prompt();
        return;
      }
      // Otherwise allow chat / info chat via session.execute below.
    } else {
      console.log(highlightCommandHints(t("mission_resolved_hint")));
      if (!rlClosed) rl.prompt();
      return;
    }
  }

  if (chatGatePending) {
    if (!trimmed) {
      if (!rlClosed) rl.prompt();
      return;
    }
    if (trimmed.startsWith("chat")) {
      chatGatePending = false;
      clearTerminal("chat-gate-open");
      await runTerminalClientChatGate();
      printOperationFooter(campaignState);
      if (!rlClosed) {
        try {
          rl.resume();
        } catch {
          /* ignore */
        }
        rl.setPrompt(tone("> ", "green"));
        rl.prompt();
      }
      return;
    }
    if (trimmed.startsWith("info")) {
      await session.execute(line);
      if (!rlClosed) rl.prompt();
      return;
    }
    console.log(
      `${tone("You have 1 incoming message.", "green")} Type ${tone("chat", "cyan")} first.`,
    );
    if (!rlClosed) rl.prompt();
    return;
  }

  await session.execute(line);
  persistCurrentSnapshot();

  if (campaignState.tutorialEnabled && mission.tutorial?.steps?.length) {
    await session.showTutorialHint?.();
  }

  if (!rlClosed) rl.prompt();
});

setWaitEnterContinueImpl(waitForBootEnterLine);

function finishMainShellAndQaHints() {
  bootComplete = true;
  if (!rlClosed) {
    rl.setPrompt(tone("> ", "green"));
    try {
      rl.prompt();
    } catch {
      /* Piped stdin may close readline before prompt (e.g. CLI E2E). */
    }
  }
  if (process.stdin.isTTY) {
    try {
      process.stdin.ref();
    } catch {
      /* ignore */
    }
  }
  if (process.env.HKTM_QA === "1") {
    console.error(
      "[HKTM QA | Elliot] Pass 1 OK — `>` visible. Run HKTM_QA=2 for cycle B before you call it a night.\n",
    );
  } else if (process.env.HKTM_QA === "2") {
    console.error(
      "[HKTM QA | Elliot] Pass 2 OK — both cycles on record; EXIT-QA.md sign-off.\n",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function main() {
  if (startupCheckpoint && !process.stdin.isTTY) {
    throw new Error(`--checkpoint ${startupCheckpoint} requires an interactive TTY.`);
  }

  const chatGateOnBoot = shouldRunTerminalClientChatGate();

  if (composeMailCheckpoint || composeMailReadyCheckpoint) {
    // Fast-path to mission shell + immediate compose flow for rapid iteration/testing.
    clearTerminal("checkpoint-compose-mail");
    await session.printBanner();
    printOperationFooter(campaignState);
    console.log(tone(`\n[checkpoint] ${startupCheckpoint}`, "dim"));
    // Prime readline before the first raw Enter wait (Windows/Cursor: stdin can drop without a prior prompt cycle).
    try {
      process.stdin.ref();
    } catch {
      /* ignore */
    }
    try {
      rl.resume();
    } catch {
      /* ignore */
    }
    rl.setPrompt("");
    rl.prompt();
    try {
      rl.pause();
    } catch {
      /* ignore */
    }
    bootComplete = true;
    await session.execute("mail");
    persistCurrentSnapshot();
    if (session.state.finished) {
      await moveToNextMission();
      if (appClosing) return;
    }
  } else if (startupCheckpoint === "chat-gate") {
    applyOperatorProfileFromState(campaignState);
    clearTerminal("checkpoint-chat-gate");
    printIncomingMessageHint();
    chatGatePending = true;
    finishMainShellAndQaHints();
    return;
  } else if (startupCheckpoint === "mission-shell") {
    applyOperatorProfileFromState(campaignState);
    clearTerminal("checkpoint-mission-shell");
    await session.printBanner();
    printOperationFooter(campaignState);
    console.log(tone(`\n[checkpoint] ${startupCheckpoint}`, "dim"));
    chatGatePending = false;
    finishMainShellAndQaHints();
    return;
  } else if (startupCheckpoint === "mission-complete-m1") {
    session.state.finished = true;
    session.state.result = "success";
    persistCurrentSnapshot();
    applyOperatorProfileFromState(campaignState);
    clearTerminal("checkpoint-mission-complete-m1");
    console.log(tone(`\n[checkpoint] ${startupCheckpoint}`, "dim"));
    console.log(
      tone("Mission 1 marked success — try `next`, `chat`, or `info chat` (same as after a harvest).", "dim"),
    );
    printOperationFooter(campaignState);
    chatGatePending = false;
    finishMainShellAndQaHints();
    return;
  } else {
    const introClearStep =
      startupCheckpoint && BOOT_INTRO_CHECKPOINTS.has(startupCheckpoint)
        ? `checkpoint-${startupCheckpoint}`
        : "boot-intro";
    await runBootRender(campaignState, async () => {
      if (introClearStep !== "boot-intro") {
        clearTerminal(introClearStep);
      }
      await runTerminalIntroSequence({
        campaignState,
        save: () => saveCampaignState(campaignState),
        readLine: readLineForSetup,
        readLineGhost: readLineForSetupGhost,
        campaignSavePath,
        skipSplash: startupCheckpoint === "kernel-loading",
      });
      applyOperatorProfileFromState(campaignState);

      if (chatGateOnBoot && !campaignState.shadowNetImIntroCompleted) {
        printIncomingMessageHint();
      } else {
        clearTerminal("boot-mission-banner");
        await session.printBanner();
      }
    });
  }

  if (chatGateOnBoot) {
    chatGatePending = true;
  } else if (!composeMailCheckpoint && !composeMailReadyCheckpoint) {
    printOperationFooter(campaignState);
  }

  finishMainShellAndQaHints();
}
