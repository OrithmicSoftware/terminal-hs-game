/**
 * Splash, operator region + codename, disconnect screen (browser shell).
 */
import {
  REGIONS,
  DEFAULT_OPERATOR_REGION_ID,
  DEFAULT_OPERATOR_CODENAME,
} from "../src/operator-regions.mjs";
import { getBootTagline } from "../src/i18n.mjs";
import {
  markTerminalBootSequenceDone,
  shouldRunTerminalBootSequence,
  showIncomingMessageHint,
  showTerminalLoadingScreen,
} from "./terminal-loading.mjs";

export { REGIONS, DEFAULT_OPERATOR_REGION_ID, DEFAULT_OPERATOR_CODENAME };

export const LS_PROFILE = "hktm_operator_profile";
/** Same key as `web/campaign-browser.mjs` — persisted campaign save. */
const LS_CAMPAIGN = "hktm_campaign_save";
const VALID_MINIGAME_TYPES = new Set(["cipher", "crack", "patch"]);

/** True when a browser campaign save exists (returning session). */
export function hasExistingCampaignSave() {
  try {
    const raw = localStorage.getItem(LS_CAMPAIGN);
    if (!raw || !String(raw).trim()) return false;
    const p = JSON.parse(raw);
    return Array.isArray(p?.missions) && p.missions.length > 0;
  } catch {
    return false;
  }
}

/** @type {{ regionId: string, codename: string, schemaVersion: number } | null} */
let cachedProfile = null;

export function isE2eUrl() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("e2e") === "1";
  } catch {
    return false;
  }
}

export function getRequestedMiniGame() {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? "").get("minigame");
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return VALID_MINIGAME_TYPES.has(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

/** Call after clearing `localStorage` operator profile (e.g. dev “fresh boot”). */
export function clearOperatorProfileCache() {
  cachedProfile = null;
}

export function loadOperatorProfile() {
  if (cachedProfile) return cachedProfile;
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.codename || !p?.regionId) return null;
    cachedProfile = {
      regionId: String(p.regionId),
      codename: String(p.codename).slice(0, 32),
      schemaVersion: Number(p.schemaVersion) || 1,
    };
    applyProfileGlobals(cachedProfile);
    return cachedProfile;
  } catch {
    return null;
  }
}

export function applyProfileGlobals(profile) {
  globalThis.__HKTM_PROFILE = {
    regionId: profile.regionId,
    codename: profile.codename,
  };
}

function saveProfile(profile) {
  cachedProfile = profile;
  try {
    localStorage.setItem(LS_PROFILE, JSON.stringify({ ...profile, schemaVersion: 1 }));
  } catch {
    /* ignore */
  }
  applyProfileGlobals(profile);
}

export function showSplashScreen() {
  const el = document.getElementById("hktm-splash");
  if (!el) return Promise.resolve();

  const hint = document.getElementById("hktm-splash-start-hint");
  if (hint) hint.hidden = true;

  const sub = el.querySelector(".hktm-splash-sub");
  if (sub) sub.textContent = getBootTagline();

  const skip = el.querySelector("[data-hktm-splash-skip]");
  if (skip instanceof HTMLElement) skip.hidden = true;
  const actions = el.querySelector(".hktm-splash-actions");
  if (actions instanceof HTMLElement) actions.hidden = true;

  el.classList.remove("hktm-hidden");
  el.hidden = false;
  return new Promise(() => {});
}

export function showOperatorDialog() {
  const root = document.getElementById("hktm-intro");
  if (!root) return Promise.resolve();

  root.classList.remove("hktm-hidden");
  root.hidden = false;
  const grid = root.querySelector(".hktm-region-grid");
  const input = root.querySelector('input[name="codename"]');
  const commit = root.querySelector("[data-hktm-intro-commit]");
  const cancel = root.querySelector("[data-hktm-intro-cancel]");

  /** @type {string | null} */
  let selected = DEFAULT_OPERATOR_REGION_ID;

  grid.innerHTML = "";
  for (const r of REGIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hktm-region-btn";
    b.dataset.region = r.id;
    b.innerHTML = `<span class="code">${r.id}</span><span class="name">${r.name}</span>`;
    b.title = r.flavor;
    b.addEventListener("click", () => {
      selected = r.id;
      grid.querySelectorAll(".hktm-region-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
    grid.appendChild(b);
  }
  grid.querySelector(`.hktm-region-btn[data-region="${DEFAULT_OPERATOR_REGION_ID}"]`)?.classList.add("selected");

  if (input) input.value = DEFAULT_OPERATOR_CODENAME;

  return new Promise((resolve) => {
    const finish = (profile) => {
      root.classList.add("hktm-hidden");
      root.hidden = true;
      resolve(profile);
    };

    const onCommit = () => {
      const name = String(input?.value ?? "").trim() || DEFAULT_OPERATOR_CODENAME;
      if (!selected) return;
      const profile = { regionId: selected, codename: name.slice(0, 32), schemaVersion: 1 };
      saveProfile(profile);
      finish(profile);
    };

    commit?.addEventListener("click", onCommit, { once: true });
    cancel?.addEventListener(
      "click",
      () => {
        const profile = {
          regionId: DEFAULT_OPERATOR_REGION_ID,
          codename: DEFAULT_OPERATOR_CODENAME,
          schemaVersion: 1,
        };
        saveProfile(profile);
        finish(profile);
      },
      { once: true },
    );
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
      }
    });
  });
}

export async function runIntroSequence() {
  try {
    const requestedMiniGame = getRequestedMiniGame();
    if (isE2eUrl()) {
      const existing = loadOperatorProfile();
      if (!existing) {
        saveProfile({ regionId: "PAC-RIM", codename: "E2E-OP", schemaVersion: 1 });
      }
      return;
    }

    if (requestedMiniGame) {
      if (!loadOperatorProfile()) {
        saveProfile({
          regionId: DEFAULT_OPERATOR_REGION_ID,
          codename: DEFAULT_OPERATOR_CODENAME,
          schemaVersion: 1,
        });
      }
      sessionStorage.setItem("hktm_splash_done", "1");
      sessionStorage.setItem("hktm_terminal_boot_done", "1");
      return;
    }

    if (!sessionStorage.getItem("hktm_splash_done")) {
      await showSplashScreen();
      sessionStorage.setItem("hktm_splash_done", "1");
    }

    if (!loadOperatorProfile()) {
      await showOperatorDialog();
    } else {
      loadOperatorProfile();
    }

    // 3 — faux terminal boot (after splash + survey, before campaign / chat)
    if (shouldRunTerminalBootSequence()) {
      await showTerminalLoadingScreen();
      markTerminalBootSequenceDone();
      showIncomingMessageHint();
    }
  } finally {
    try {
      document.documentElement.classList.remove("hktm-boot-pending");
    } catch {
      /* ignore */
    }
  }
}

/**
 * @returns {Promise<void>}
 */
export function flashDisconnectScreen() {
  const el = document.getElementById("hktm-disconnect");
  if (!el) return Promise.resolve();

  const p = globalThis.__HKTM_PROFILE;
  const line = el.querySelector("[data-hktm-disc-msg]");
  if (line) {
    line.textContent = p?.codename
      ? `Session key revoked for «${p.codename}». Handler channel closed.`
      : "Session key revoked. Handler channel closed.";
  }

  el.classList.remove("hktm-hidden");
  return new Promise((resolve) => {
    setTimeout(() => {
      el.classList.add("hktm-hidden");
      resolve();
    }, 2600);
  });
}
