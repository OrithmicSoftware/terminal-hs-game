/**
 * Shared campaign save shape for Node (`campaign-save.json`) and browser (`localStorage`).
 * @param {Array<{ id: string }>} missions
 */
function newContactAliasSeed() {
  try {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `hktm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createInitialCampaignState(missions) {
  return {
    schemaVersion: 2,
    contactAliasSeed: newContactAliasSeed(),
    currentMissionIndex: 0,
    tutorialEnabled: true,
    language: "en",
    uiMode: "pip",
    typing: true,
    beep: false,
    seenTerminalBoot: false,
    /** After first ShadowNet IM `/exit`, suppress boot "incoming message" hint on future sessions. */
    shadowNetImIntroCompleted: false,
    operatorRegionId: "",
    operatorCodename: "",
    missions: missions.map((m) => ({
      missionId: m.id,
      status: "locked",
      snapshot: null,
    })),
  };
}

/**
 * @param {object} state
 * @param {Array<{ id: string }>} missions
 */
export function ensureCampaignConsistency(state, missions) {
  if (!state.missions || state.missions.length !== missions.length) {
    const fresh = createInitialCampaignState(missions);
    fresh.missions[0].status = "active";
    return fresh;
  }
  if (state.currentMissionIndex < 0 || state.currentMissionIndex >= missions.length) {
    state.currentMissionIndex = 0;
  }
  for (let i = 0; i < state.missions.length; i += 1) {
    if (!state.missions[i].status) state.missions[i].status = i === 0 ? "active" : "locked";
  }
  if (typeof state.tutorialEnabled !== "boolean") state.tutorialEnabled = true;
  if (typeof state.schemaVersion !== "number" || state.schemaVersion < 2) {
    state.schemaVersion = 2;
    state.language = "en";
  }
  if (!state.language) state.language = "en";
  if (!state.uiMode) state.uiMode = "pip";
  if (typeof state.typing !== "boolean") state.typing = true;
  if (typeof state.beep !== "boolean") state.beep = false;
  if (typeof state.contactAliasSeed !== "string" || !state.contactAliasSeed.trim()) {
    state.contactAliasSeed = newContactAliasSeed();
  }
  if (typeof state.seenTerminalBoot !== "boolean") state.seenTerminalBoot = false;
  if (typeof state.shadowNetImIntroCompleted !== "boolean") state.shadowNetImIntroCompleted = false;
  if (typeof state.operatorRegionId !== "string") state.operatorRegionId = "";
  if (typeof state.operatorCodename !== "string") state.operatorCodename = "";
  return state;
}
