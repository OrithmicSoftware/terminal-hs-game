/**
 * Node CLI boot: splash every interactive start → operator survey only if no profile → faux loading once.
 * (Web: #hktm-splash each session → #hktm-intro if needed → #hktm-terminal-loading — see intro-flow.mjs.)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { tone } from "./colors.mjs";
import { t } from "./i18n.mjs";
import {
  REGIONS,
  DEFAULT_OPERATOR_REGION_ID,
  DEFAULT_OPERATOR_CODENAME,
} from "./operator-regions.mjs";
import { generateOperatorNickname } from "./operator-nickname.mjs";
import { getLastSceneName, resetSceneDebugChain } from "./debug-scene.mjs";
import { clearTerminalScreen, drainStdinSync, logInfoPauseStep, logScreenStep, waitForEnterContinue, wrap } from "./ui.mjs";
import { printCliPixelBanner } from "./cli-pixel-banner.mjs";
import { animSleep } from "./anim-sleep-core.mjs";

function getPackageVersion() {
  try {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const raw = fs.readFileSync(path.join(root, "package.json"), "utf8");
    const v = JSON.parse(raw)?.version;
    return typeof v === "string" && v.trim() ? v.trim() : "dev";
  } catch {
    return "dev";
  }
}

function shouldSkipBootEnv() {
  return process.env.HKTM_SKIP_TERM_BOOT === "1";
}

function isQaBoot() {
  return process.env.HKTM_QA === "1" || process.env.HKTM_QA === "2";
}

function needsOperatorProfile(state) {
  const r = String(state?.operatorRegionId ?? "").trim();
  const c = String(state?.operatorCodename ?? "").trim();
  return !r || !c;
}

/**
 * @param {{
 *   campaignState: object,
 *   save: () => void,
 *   readLine: (prompt: string) => Promise<string>,
 *   readLineGhost?: (prompt: string, ghost: string, opts?: { maxLen?: number }) => Promise<string>,
 *   campaignSavePath?: string,
 *   stopAfter?: "splash" | "operator-survey" | "kernel-loading",
 *   skipSplash?: boolean,
 * }} ctx
 */
export async function runTerminalIntroSequence(ctx) {
  const { campaignState, save, readLine, readLineGhost, campaignSavePath, stopAfter, skipSplash } = ctx;

  if (isQaBoot()) {
    applyNonInteractiveDefaultsIfNeeded(campaignState, save);
    return;
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY;

  if (!interactive) {
    applyNonInteractiveDefaultsIfNeeded(campaignState, save);
    if (!campaignState.seenTerminalBoot && !shouldSkipBootEnv()) {
      campaignState.seenTerminalBoot = true;
      save();
    }
    return;
  }

  resetSceneDebugChain();

  // 1) Splash — every process start (readline: Enter dismisses; same copy as web “any key”)
  if (!skipSplash) {
    logScreenStep("boot-intro");
    printCliPixelBanner();
    for (const row of wrap(t("boot_tagline"), 72)) {
      console.log(tone(row, "dim"));
    }
    console.log("");
    const hadSaveAtBoot =
      typeof campaignSavePath === "string" &&
      campaignSavePath.length > 0 &&
      fs.existsSync(campaignSavePath);
    drainStdinSync();
    logInfoPauseStep("boot-intro");
    await waitForEnterContinue(
      t(hadSaveAtBoot ? "splash_press_any_key_continue" : "splash_press_any_key"),
    );
    clearTerminalScreen("post-splash");
    if (stopAfter === "splash") {
      return;
    }
  }

  // 2) Operator survey only when save has no region/codename (existing game continues after splash)
  if (needsOperatorProfile(campaignState)) {
    logScreenStep("operator-survey");
    await runTerminalOperatorProfile(readLine, readLineGhost, campaignState);
    save();
  }
  if (stopAfter === "operator-survey") {
    return;
  }

  // 3) Faux kernel loading (web: hktm-terminal-loading)
  if (!campaignState.seenTerminalBoot) {
    if (shouldSkipBootEnv()) {
      campaignState.seenTerminalBoot = true;
      save();
    } else {
      await runTerminalLoadingSequence();
      campaignState.seenTerminalBoot = true;
      save();
    }
  }
  if (stopAfter === "kernel-loading") {
    return;
  }
}

function applyNonInteractiveDefaultsIfNeeded(campaignState, save) {
  if (!needsOperatorProfile(campaignState)) return;
  const codename = (
    process.env.HKTM_CODENAME ||
    process.env.USER ||
    DEFAULT_OPERATOR_CODENAME
  ).slice(0, 32);
  campaignState.operatorRegionId = DEFAULT_OPERATOR_REGION_ID;
  campaignState.operatorCodename = codename;
  save();
}

/**
 * Faux kernel lines + `[SCENE: kernel-loading type=log …]`.
 * @param {{ instant?: boolean }} [options] — `instant`: no pacing delays; debug line includes `animate=false` and `prev=` from the last scene (pager `…-exit` → base id).
 */
export async function runTerminalLoadingSequence(options = {}) {
  const instant = options.instant === true;
  const prevSemantic = getLastSceneName().replace(/-exit$/, "");
  logScreenStep("kernel-loading", {
    animate: instant ? false : undefined,
    prevOverride: instant ? prevSemantic : undefined,
  });
  const v = getPackageVersion();
  const lines = [
    t("terminal_loading_kernel").replace("%s", v),
    t("terminal_loading_line_rng"),
    t("terminal_loading_line_policy"),
    t("terminal_loading_line_handshake"),
    t("terminal_loading_line_channel"),
    t("terminal_loading_line_ready"),
  ];
  console.log("");
  console.log(tone(t("terminal_loading_skip_hint"), "dim"));
  let i = 0;
  const stepMs = instant ? 0 : 300;
  const handshakeMs = instant ? 0 : 480;
  const tailMs = instant ? 0 : 520;
  for (const line of lines) {
    console.log(tone(line, i === 4 ? "yellow" : "dim"));
    i += 1;
    // Match web terminal-loading.mjs pacing (handshake line slightly slower).
    await animSleep(i === 4 ? handshakeMs : stepMs);
  }
  await animSleep(tailMs);
}

/**
 * @param {(prompt: string) => Promise<string>} readLine
 * @param {((prompt: string, ghost: string, opts?: { maxLen?: number }) => Promise<string>) | undefined} readLineGhost
 * @param {object} campaignState
 */
async function runTerminalOperatorProfile(readLine, readLineGhost, campaignState) {
  const readGhost =
    readLineGhost ??
    ((prompt, _ghost, _opts) => {
      return readLine(prompt);
    });

  console.log(tone(t("terminal_setup_region_title"), "bold"));
  REGIONS.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${tone(r.id, "cyan")} — ${r.name} ${tone(`(${r.flavor})`, "dim")}`);
  });
  const regionPrompt = t("terminal_setup_region_prompt").replace("%s", DEFAULT_OPERATOR_REGION_ID);
  let regionId = "";
  while (!regionId) {
    const raw = await readGhost(regionPrompt, "1", { maxLen: 8 });
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") {
      regionId = DEFAULT_OPERATOR_REGION_ID;
      break;
    }
    const n = parseInt(trimmed, 10);
    if (n >= 1 && n <= REGIONS.length) {
      regionId = REGIONS[n - 1].id;
    } else {
      console.log(tone(t("terminal_setup_region_invalid"), "yellow"));
    }
  }
  /* One-line confirmation with resolved id (do not re-print the long prompt — in-place clear is unreliable when the prompt wraps). */
  console.log(tone(t("terminal_setup_region_resolved").replace("%s", regionId), "green"));
  const suggestedNickname = generateOperatorNickname();
  const nameRaw = await readGhost(t("terminal_setup_codename_prompt"), suggestedNickname, { maxLen: 32 });
  const codename = String(nameRaw ?? "").trim() || suggestedNickname;
  campaignState.operatorRegionId = regionId;
  campaignState.operatorCodename = codename.slice(0, 32);
}
