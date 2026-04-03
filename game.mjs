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
  waitForEnterContinue,
} from "./src/ui.mjs";
import { tone } from "./src/colors.mjs";
import { setLanguage, t } from "./src/i18n.mjs";

/** Boot banner/splash: turbo (≥20k) so intro draws line-at-once — ~2×+ faster than 2200 CPS crawl. */
const BOOT_RENDER_CPS = 20000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const missionPath = path.join(__dirname, "missions", "m1-ghost-proxy.json");
const campaignSavePath = path.join(__dirname, "campaign-save.json");

function clearTerminal() {
  clearTerminalScreen();
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

/** Commands for TAB completion (deduped; mission adds connect/scan/exploit paths). */
const STATIC_TAB_COMMANDS = [
  "beep off",
  "beep on",
  "campaign",
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
  "quit",
  "reset",
  "retry",
  "scan",
  "scan ports",
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
    out.push(`connect ${id}`, `scan ${id}`, `scan ports ${id}`);
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

function createTabCompleter(getMission) {
  return (line) => {
    const m = getMission();
    const merged = [...STATIC_TAB_COMMANDS, ...missionTabCompletions(m)];
    const uniq = [...new Set(merged)].sort((a, b) => a.localeCompare(b));
    const prefix = line.trimStart().toLowerCase();
    const hits = uniq.filter((c) => c.toLowerCase().startsWith(prefix));
    return [hits, line];
  };
}

const handcraftedMission = JSON.parse(fs.readFileSync(missionPath, "utf8"));
const proceduralMissions = generateProceduralMissions(5);
const campaign = [handcraftedMission, ...proceduralMissions];

function createInitialCampaignState() {
  return {
    schemaVersion: 2,
    currentMissionIndex: 0,
    tutorialEnabled: true,
    language: "en",
    uiMode: "pip",
    typing: true,
    beep: false,
    missions: campaign.map((m) => ({
      missionId: m.id,
      status: "locked",
      snapshot: null,
    })),
  };
}

function loadCampaignState() {
  if (!fs.existsSync(campaignSavePath)) {
    const fresh = createInitialCampaignState();
    fresh.missions[0].status = "active";
    return fresh;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(campaignSavePath, "utf8"));
    if (!Array.isArray(parsed.missions)) throw new Error("bad save");
    return parsed;
  } catch {
    const fresh = createInitialCampaignState();
    fresh.missions[0].status = "active";
    return fresh;
  }
}

function saveCampaignState(state) {
  fs.writeFileSync(campaignSavePath, JSON.stringify(state, null, 2), "utf8");
}

function ensureCampaignConsistency(state) {
  if (!state.missions || state.missions.length !== campaign.length) {
    return createInitialCampaignState();
  }
  if (state.currentMissionIndex < 0 || state.currentMissionIndex >= campaign.length) {
    state.currentMissionIndex = 0;
  }
  for (let i = 0; i < state.missions.length; i += 1) {
    if (!state.missions[i].status) state.missions[i].status = i === 0 ? "active" : "locked";
  }
  if (typeof state.tutorialEnabled !== "boolean") state.tutorialEnabled = true;
  // v1 saves defaulted language to ru; migrate to English UI (schema v2).
  if (typeof state.schemaVersion !== "number" || state.schemaVersion < 2) {
    state.schemaVersion = 2;
    state.language = "en";
  }
  if (!state.language) state.language = "en";
  if (!state.uiMode) state.uiMode = "pip";
  if (typeof state.typing !== "boolean") state.typing = true;
  if (typeof state.beep !== "boolean") state.beep = false;
  return state;
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
    // ≥20000 → full-line turbo in ui.typeLine (snappy mission output; avoids slow per-char boxes).
    cps: state.uiMode === "pip" ? 24000 : 22000,
  });
}

async function runBootRender(state, draw) {
  applyUi(state);
  setUiOptions({ cps: BOOT_RENDER_CPS });
  try {
    await draw();
  } finally {
    applyUi(state);
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
    `${tone(`${t("campaign_board_label")}:`, "magenta")} ${tone("campaign", "cyan")}`,
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
  );
}

function printCampaignSummary(state) {
  console.log(`\n=== ${t("campaign_ops_board")} ===`);
  campaign.forEach((m, i) => {
    const marker = i === state.currentMissionIndex ? " <current>" : "";
    console.log(`${i + 1}. ${m.title} [${state.missions[i].status}]${marker}`);
  });
  console.log(`${t("save_path")}: ${campaignSavePath}`);
  console.log(t("controls_line"));
}

function activateMission(state, missionIndex) {
  const mission = campaign[missionIndex];
  const missionState = state.missions[missionIndex];
  missionState.status = missionState.status === "completed" ? "completed" : "active";
  const session = createMissionSession(mission, missionState.snapshot);
  return { mission, session };
}

let campaignState = loadCampaignState();
const schemaBefore = campaignState.schemaVersion;
campaignState = ensureCampaignConsistency(campaignState);
if (schemaBefore !== campaignState.schemaVersion) {
  saveCampaignState(campaignState);
}
setLanguage(campaignState.language);
applyUi(campaignState);
let { mission, session } = activateMission(campaignState, campaignState.currentMissionIndex);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  completer: createTabCompleter(() => mission),
});

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

/** QA: two-pass boot verification (see docs/qa/EXIT-QA.md). */
if (process.env.HKTM_QA === "1") {
  console.error(
    "\n[HKTM QA] Pass 1/2 — Run full boot (Enter twice). Process must not return to shell before `>`.\n",
  );
} else if (process.env.HKTM_QA === "2") {
  console.error(
    "\n[HKTM QA] Pass 2/2 — Repeat cold start from the same terminal session; log any early exit.\n",
  );
}
if (process.env.HKTM_QA) {
  process.once("beforeExit", (code) => {
    console.error(`[HKTM QA] beforeExit (code ${code}) — unexpected? attach log in EXIT-QA.md cycle B.\n`);
  });
}

let appClosing = false;
let rlClosed = false;

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
        await session.printBanner();
        await waitForEnterContinue(t("press_enter_continue"));
      });
      printCampaignSummary(campaignState);
      session.showMap();
      session.showStatus();
    } else {
      console.log(`\n${t("campaign_complete")}`);
      appClosing = true;
      rl.close();
    }
  } else if (currentMissionState.snapshot.result === "failed") {
    currentMissionState.status = "failed";
    console.log(`\n${t("mission_failed_retry")}`);
  } else if (currentMissionState.snapshot.result === "aborted") {
    console.log(`\n${t("session_aborted")}`);
    appClosing = true;
    rl.close();
  }
  saveCampaignState(campaignState);
}

rl.on("line", async (line) => {
  if (rlClosed) return;
  if (shouldClearScreen(line)) {
    clearTerminal();
  }
  const trimmed = line.trim().toLowerCase();
  if (trimmed === "ui pip") {
    campaignState.uiMode = "pip";
    applyUi(campaignState);
    saveCampaignState(campaignState);
    console.log(t("ui_set_pip"));
    await runBootRender(campaignState, async () => {
      await session.printBanner();
      await waitForEnterContinue(t("press_enter_continue"));
      clearTerminal();
      await showSplash(campaignState);
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
      await session.printBanner();
      await waitForEnterContinue(t("press_enter_continue"));
      clearTerminal();
      await showSplash(campaignState);
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
    campaignState = createInitialCampaignState();
    campaignState.missions[0].status = "active";
    applyUi(campaignState);
    saveCampaignState(campaignState);
    ({ mission, session } = activateMission(campaignState, campaignState.currentMissionIndex));
    console.log(`\n${t("campaign_reset")}\n`);
    await runBootRender(campaignState, async () => {
      await session.printBanner();
      await waitForEnterContinue(t("press_enter_continue"));
      clearTerminal();
      await showSplash(campaignState);
    });
    printCampaignSummary(campaignState);
    session.showMap();
    session.showStatus();
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

  if (trimmed === "campaign") {
    printCampaignSummary(campaignState);
    if (!rlClosed) rl.prompt();
    return;
  }

  if (trimmed === "retry") {
    campaignState.missions[campaignState.currentMissionIndex].snapshot = null;
    campaignState.missions[campaignState.currentMissionIndex].status = "active";
    ({ mission, session } = activateMission(campaignState, campaignState.currentMissionIndex));
    saveCampaignState(campaignState);
    await runBootRender(campaignState, async () => {
      await session.printBanner();
      await waitForEnterContinue(t("press_enter_continue"));
    });
    session.showMap();
    session.showStatus();
    if (!rlClosed) rl.prompt();
    return;
  }

  if (session.state.finished) {
    console.log(t("mission_resolved_hint"));
    if (!rlClosed) rl.prompt();
    return;
  }

  await session.execute(line);
  persistCurrentSnapshot();

  if (campaignState.tutorialEnabled) {
    await session.showTutorialHint?.();
  }

  if (session.state.finished) {
    await moveToNextMission();
    if (appClosing) return;
  }

  if (!rlClosed) rl.prompt();
});

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function main() {
  await runBootRender(campaignState, async () => {
    clearTerminal();
    await session.printBanner();
    await waitForEnterContinue(t("press_enter_continue"));
    if (process.env.HKTM_QA) {
      console.error(
        "[HKTM QA] Second warning: banner Enter OK — splash loading next; process must not return to shell yet.\n",
      );
    }
    clearTerminal();
    await showSplash(campaignState);
  });
  printCampaignSummary(campaignState);
  session.showMap();
  session.showStatus();
  rl.setPrompt("> ");
  rl.prompt();
  if (process.stdin.isTTY) {
    try {
      process.stdin.ref();
    } catch {
      /* ignore */
    }
  }
  if (process.env.HKTM_QA === "1") {
    console.error("[HKTM QA] Pass 1 complete: `>` shown. Next run with HKTM_QA=2 for cycle B.\n");
  } else if (process.env.HKTM_QA === "2") {
    console.error("[HKTM QA] Pass 2 complete: both cycles logged — close EXIT-QA.md checklist.\n");
  }
}
