/**
 * Full campaign loop for the browser build: same mission list as Node (m1 + procedural),
 * persist `campaign-save` shape to localStorage.
 */
import { createMissionSession } from "../src/engine.mjs";
import { generateProceduralMissions } from "../src/generator.mjs";
import { createInitialCampaignState, ensureCampaignConsistency } from "../src/campaign-state.mjs";
import { setLanguage, t } from "../src/i18n.mjs";
import { tone } from "../src/colors-browser.mjs";
import {
  setUiOptions,
  getUiOptions,
  waitForEnterContinue,
  wrap,
  boxEnterPaged,
  playTestBeep,
  clearTerminalScreen,
} from "../src/ui-browser.mjs";
import { shouldClearMissionWeb } from "./mission-clear.mjs";
import { playUiClick, playUiSelect, playUiBrowse } from "./ui-sounds.mjs";
import { flashDisconnectScreen, isE2eUrl, runIntroSequence } from "./intro-flow.mjs";
import {
  waitForInitialBriefGate,
  syncGhostChatContactAlias,
  postMissionBriefingToChat,
  clearMissionBriefingCache,
  hydrateGhostChatFromCampaign,
  resetGhostChatLogForNewCampaign,
} from "./ghost-chat.mjs";
import { resolveContactAlias } from "../src/contact-alias.mjs";
import { BOOT_RENDER_CPS } from "../src/boot-constants.mjs";

const LS_KEY = "hktm_campaign_save";
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

function applyUi(state) {
  setUiOptions({
    mode: state.uiMode,
    typing: state.typing,
    beep: state.beep,
    width: computeFrameWidth(state.uiMode),
    cps: state.uiMode === "pip" ? 48000 : 44000,
  });
  syncSoundToggleButton();
}

function loadCampaignStateFromLs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.missions)) throw new Error("bad save");
    return parsed;
  } catch {
    return null;
  }
}

function saveCampaignStateToLs(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

async function loadCampaignMissions() {
  const res = await fetch(`/missions/m1-ghost-proxy.json?v=${encodeURIComponent(String(Date.now()))}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("mission fetch failed");
  const m1 = await res.json();
  const procedural = generateProceduralMissions(5);
  return [m1, ...procedural];
}

function activateMission(state, missions, missionIndex) {
  const mission = missions[missionIndex];
  const missionState = state.missions[missionIndex];
  missionState.status = missionState.status === "completed" ? "completed" : "active";
  const alias = resolveContactAlias(state.contactAliasSeed);
  globalThis.__HKTM_CONTACT_ALIAS = alias;
  syncGhostChatContactAlias(alias);
  const session = createMissionSession(mission, missionState.snapshot, {
    contactAliasSeed: state.contactAliasSeed,
    missionIndex,
    missionTotal: missions.length,
    shadowNetImIntroCompleted: state.shadowNetImIntroCompleted,
    /* Playwright uses ?e2e=1 — same idea as CLI HKTM_SKIP_CHAT_GATE=1 for automated runs. */
    skipM1ToolLock: isE2eUrl(),
  });
  globalThis.__HKTM_SHADOW_NET_IM_INTRO_COMPLETED = state.shadowNetImIntroCompleted;
  return { mission, session };
}

function printOperationFooter(state, missions) {
  const cur = missions[state.currentMissionIndex];
  console.log(`\n${tone(t("current_operation"), "bold")} ${tone(cur.title, "green")}`);
  console.log(`${t("save_path")}: ${t("browser_save_detail")}`);
  console.log(t("controls_line"));
}

async function runBootRender(state, draw) {
  applyUi(state);
  /* E2E: keep boot typing slow enough for Playwright + reliable Space/Enter skip between chars. */
  const cps = isE2eUrl() ? 320 : BOOT_RENDER_CPS;
  setUiOptions({ cps });
  try {
    await draw();
  } finally {
    applyUi(state);
  }
}

function pauseReadlineForSplashTyping() {
  /* Node readline pause; browser has no readline buffer issue */
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

export async function bootBrowserCampaign() {
  const cmdInput = document.getElementById("cmd");
  const inputRow = document.querySelector(".input-row");

  const missions = await loadCampaignMissions();
  let campaignState = loadCampaignStateFromLs();
  if (!campaignState) {
    campaignState = createInitialCampaignState(missions);
    campaignState.missions[0].status = "active";
    campaignState.beep = loadSoundPreference();
  }
  const schemaBefore = campaignState.schemaVersion;
  campaignState = ensureCampaignConsistency(campaignState, missions);
  if (schemaBefore !== campaignState.schemaVersion) {
    saveCampaignStateToLs(campaignState);
  }

  setLanguage(campaignState.language);
  applyUi(campaignState);

  let { mission, session } = activateMission(campaignState, missions, campaignState.currentMissionIndex);

  let ghostChatSaveTimer = null;
  function flushGhostChatSaveSoon() {
    if (ghostChatSaveTimer) clearTimeout(ghostChatSaveTimer);
    ghostChatSaveTimer = setTimeout(() => {
      ghostChatSaveTimer = null;
      saveCampaignStateToLs(campaignState);
    }, 400);
  }

  globalThis.__HKTM_APPEND_GHOST_CHAT_ENTRY = (entry) => {
    if (!Array.isArray(campaignState.ghostChatMessages)) campaignState.ghostChatMessages = [];
    campaignState.ghostChatMessages.push(entry);
    if (campaignState.ghostChatMessages.length > 400) {
      campaignState.ghostChatMessages.splice(0, campaignState.ghostChatMessages.length - 400);
    }
    flushGhostChatSaveSoon();
  };

  globalThis.__HKTM_SYNC_GHOST_BRIEF_MISSION_ID = (id) => {
    campaignState.ghostChatLastBriefedMissionId = typeof id === "string" ? id : null;
    saveCampaignStateToLs(campaignState);
  };

  globalThis.__HKTM_CLEAR_GHOST_BRIEF_ID_FOR_RETRY = () => {
    campaignState.ghostChatLastBriefedMissionId = null;
    saveCampaignStateToLs(campaignState);
  };

  hydrateGhostChatFromCampaign(campaignState);

  globalThis.__HKTM_ON_SHADOW_NET_IM_EXIT = () => {
    campaignState.shadowNetImIntroCompleted = true;
    globalThis.__HKTM_SHADOW_NET_IM_INTRO_COMPLETED = true;
    saveCampaignStateToLs(campaignState);
  };

  let appClosing = false;
  let sessionEnded = false;

  function refreshMissionBriefAccessor() {
    globalThis.__HKTM_GET_MISSION_BRIEF_CONTEXT = () => ({
      mission,
      missionIndex: campaignState.currentMissionIndex,
      missionTotal: missions.length,
    });
  }
  refreshMissionBriefAccessor();

  globalThis.__HKTM_CLEAR();

  const needsInitialBriefGate =
    campaignState.currentMissionIndex === 0 && !campaignState.missions[0]?.snapshot;

  /* Brief gate is deferred: player opens ShadowNet IM via `chat` or the header — show the shell first. */
  if (needsInitialBriefGate) {
    if (typeof globalThis.__HKTM_SYNC_CMD_ROW === "function") {
      globalThis.__HKTM_SYNC_CMD_ROW();
    } else if (inputRow) {
      inputRow.style.display = "flex";
    }
    cmdInput?.focus();
  } else if (inputRow) {
    inputRow.style.display = "none";
  }

  await waitForInitialBriefGate({ enabled: needsInitialBriefGate });

  if (needsInitialBriefGate) {
    campaignState.shadowNetImIntroCompleted = true;
    globalThis.__HKTM_SHADOW_NET_IM_INTRO_COMPLETED = true;
    saveCampaignStateToLs(campaignState);
  }

  if (needsInitialBriefGate && inputRow) {
    inputRow.style.display = "none";
  }

  await runBootRender(campaignState, async () => {
    clearTerminalScreen("next-mission-banner");
    await session.printBanner();
    await waitForEnterContinue(t("press_enter_continue"));
    pauseReadlineForSplashTyping();
    await showSplash(campaignState);
  });

  try {
    globalThis.__HKTM_PRIME_AUDIO?.();
  } catch {
    /* ignore */
  }

  if (typeof globalThis.__HKTM_SYNC_CMD_ROW === "function") {
    globalThis.__HKTM_SYNC_CMD_ROW();
  } else if (inputRow) {
    inputRow.style.display = "flex";
  }

  printOperationFooter(campaignState, missions);
  await postMissionBriefingToChat(mission, {
    missionIndex: campaignState.currentMissionIndex,
    missionTotal: missions.length,
  });
  session.showMap();
  session.showStatus();

  cmdInput?.focus();

  function persistCurrentSnapshot() {
    campaignState.missions[campaignState.currentMissionIndex].snapshot = session.serialize();
    saveCampaignStateToLs(campaignState);
  }

  async function moveToNextMission() {
    const idx = campaignState.currentMissionIndex;
    const currentMissionState = campaignState.missions[idx];
    currentMissionState.snapshot = session.serialize();

    if (currentMissionState.snapshot.result === "success") {
      currentMissionState.status = "completed";
      if (idx + 1 < missions.length) {
        campaignState.missions[idx + 1].status =
          campaignState.missions[idx + 1].status === "completed" ? "completed" : "active";
        campaignState.currentMissionIndex = idx + 1;
        ({ mission, session } = activateMission(campaignState, missions, campaignState.currentMissionIndex));
        refreshMissionBriefAccessor();
        console.log(`\n${t("next_mission_unlocked")}\n`);
        await runBootRender(campaignState, async () => {
          clearTerminalScreen("next-mission-banner");
          await session.printBanner();
          await waitForEnterContinue(t("press_enter_continue"));
        });
        printOperationFooter(campaignState, missions);
        await postMissionBriefingToChat(mission, {
          missionIndex: campaignState.currentMissionIndex,
          missionTotal: missions.length,
        });
        session.showMap();
        session.showStatus();
      } else {
        console.log(`\n${t("campaign_complete")}`);
        appClosing = true;
        sessionEnded = true;
        if (cmdInput) cmdInput.readOnly = true;
        inputRow?.classList.add("session-ended");
      }
    } else if (currentMissionState.snapshot.result === "failed") {
      currentMissionState.status = "failed";
      console.log(`\n${t("mission_failed_retry")}`);
    } else if (currentMissionState.snapshot.result === "aborted") {
      console.log(`\n${t("session_aborted")}`);
      appClosing = true;
      sessionEnded = true;
      if (cmdInput) cmdInput.readOnly = true;
      inputRow?.classList.add("session-ended");
    }
    saveCampaignStateToLs(campaignState);
  }

  async function performCampaignReset() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    campaignState = createInitialCampaignState(missions);
    campaignState.missions[0].status = "active";
    campaignState.beep = loadSoundPreference();
    applyUi(campaignState);
    saveCampaignStateToLs(campaignState);
    clearMissionBriefingCache();
    resetGhostChatLogForNewCampaign();
    ({ mission, session } = activateMission(campaignState, missions, campaignState.currentMissionIndex));
    refreshMissionBriefAccessor();
    try {
      sessionStorage.removeItem("hktm_terminal_boot_done");
      sessionStorage.removeItem("hktm_splash_done");
    } catch {
      /* ignore */
    }
    await runIntroSequence();
    console.log(`\n${t("campaign_reset")}\n`);
    await runBootRender(campaignState, async () => {
      clearTerminalScreen("reset-mission-banner");
      await session.printBanner();
      await waitForEnterContinue(t("press_enter_continue"));
      pauseReadlineForSplashTyping();
      await showSplash(campaignState);
    });
    printOperationFooter(campaignState, missions);
    await postMissionBriefingToChat(mission, {
      missionIndex: campaignState.currentMissionIndex,
      missionTotal: missions.length,
    });
    session.showMap();
    session.showStatus();
    sessionEnded = false;
    appClosing = false;
    if (cmdInput) cmdInput.readOnly = false;
    inputRow?.classList.remove("session-ended");
    cmdInput?.focus();
  }

  globalThis.__HKTM_RESET_CAMPAIGN = performCampaignReset;

  /**
   * @param {{ skipSubmitSound?: boolean }} [opts]
   * skipSubmitSound: set when the caller already played a sound (e.g. pointer click on cmd-enter uses ui_click).
   */
  async function submitCommandLine(opts = {}) {
    if (!cmdInput || cmdInput.readOnly) return;
    globalThis.__HKTM_RESTORE_STEP_HISTORY?.();
    try {
      globalThis.__HKTM_PRIME_AUDIO?.();
    } catch {
      /* ignore */
    }
    if (!opts.skipSubmitSound) playUiSelect();
    const line = cmdInput.value;
    cmdInput.value = "";

    if (sessionEnded) {
      console.log(tone("(Session ended — refresh the page to start over.)", "dim"));
      cmdInput?.focus();
      return;
    }

    if (shouldClearMissionWeb(line)) {
      globalThis.__HKTM_CLEAR();
    }

    const trimmed = line.trim().toLowerCase();

    if (trimmed === "ui pip") {
      campaignState.uiMode = "pip";
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      console.log(t("ui_set_pip"));
      await runBootRender(campaignState, async () => {
        clearTerminalScreen("ui-pip-banner");
        await session.printBanner();
        await waitForEnterContinue(t("press_enter_continue"));
        pauseReadlineForSplashTyping();
        await showSplash(campaignState);
      });
      cmdInput?.focus();
      return;
    }

    if (trimmed === "ui plain") {
      campaignState.uiMode = "plain";
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      console.log(t("ui_set_plain"));
      await runBootRender(campaignState, async () => {
        clearTerminalScreen("ui-plain-banner");
        await session.printBanner();
        await waitForEnterContinue(t("press_enter_continue"));
        pauseReadlineForSplashTyping();
        await showSplash(campaignState);
      });
      cmdInput?.focus();
      return;
    }

    if (trimmed === "typing on") {
      campaignState.typing = true;
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      console.log(t("typing_on"));
      cmdInput?.focus();
      return;
    }

    if (trimmed === "typing off") {
      campaignState.typing = false;
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      console.log(t("typing_off"));
      cmdInput?.focus();
      return;
    }

    if (trimmed === "beep on") {
      campaignState.beep = true;
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      playTestBeep();
      console.log(t("beep_on"));
      cmdInput?.focus();
      return;
    }

    if (trimmed === "beep off") {
      campaignState.beep = false;
      applyUi(campaignState);
      saveCampaignStateToLs(campaignState);
      console.log(t("beep_off"));
      cmdInput?.focus();
      return;
    }

    if (trimmed === "reset") {
      await performCampaignReset();
      return;
    }

    if (trimmed === "tutorial on") {
      campaignState.tutorialEnabled = true;
      saveCampaignStateToLs(campaignState);
      console.log(t("tutorial_enabled"));
      await session.showTutorialHint?.();
      cmdInput?.focus();
      return;
    }

    if (trimmed === "tutorial off") {
      campaignState.tutorialEnabled = false;
      saveCampaignStateToLs(campaignState);
      console.log(t("tutorial_disabled"));
      cmdInput?.focus();
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
      cmdInput?.focus();
      return;
    }

    if (trimmed === "quit") {
      campaignState.missions[campaignState.currentMissionIndex].snapshot = session.serialize();
      saveCampaignStateToLs(campaignState);
      console.log(`\n${t("campaign_saved_goodbye")}`);
      await flashDisconnectScreen();
      sessionEnded = true;
      if (cmdInput) cmdInput.readOnly = true;
      inputRow?.classList.add("session-ended");
      return;
    }

    if (trimmed === "retry") {
      campaignState.missions[campaignState.currentMissionIndex].snapshot = null;
      campaignState.missions[campaignState.currentMissionIndex].status = "active";
      clearMissionBriefingCache();
      ({ mission, session } = activateMission(campaignState, missions, campaignState.currentMissionIndex));
      refreshMissionBriefAccessor();
      saveCampaignStateToLs(campaignState);
      await runBootRender(campaignState, async () => {
        await session.printBanner();
        await waitForEnterContinue(t("press_enter_continue"));
      });
      printOperationFooter(campaignState, missions);
      await postMissionBriefingToChat(mission, {
        missionIndex: campaignState.currentMissionIndex,
        missionTotal: missions.length,
      });
      session.showMap();
      session.showStatus();
      cmdInput?.focus();
      return;
    }

    if (session.state.finished) {
      const res = session.state.result;
      if (res === "failed" || res === "aborted") {
        console.log(t("mission_resolved_hint"));
        cmdInput?.focus();
        return;
      }
      if (res === "success") {
        const low = trimmed;
        if (low === "next" || low === "continue" || low === "next mission") {
          await moveToNextMission();
          if (appClosing) return;
          cmdInput?.focus();
          return;
        }
        // Fall through: chat / info chat / invalid (engine prints hint).
      } else {
        console.log(t("mission_resolved_hint"));
        cmdInput?.focus();
        return;
      }
    }

    await session.execute(line);
    persistCurrentSnapshot();

    if (campaignState.tutorialEnabled && mission.tutorial?.steps?.length) {
      await session.showTutorialHint?.();
    }

    cmdInput?.focus();
  }

  cmdInput?.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    await submitCommandLine();
  });

  const cmdEnterBtn = document.getElementById("cmd-enter");
  cmdEnterBtn?.addEventListener("focus", () => playUiBrowse());
  cmdEnterBtn?.addEventListener("click", () => {
    playUiClick();
    void submitCommandLine({ skipSubmitSound: true });
  });
}
