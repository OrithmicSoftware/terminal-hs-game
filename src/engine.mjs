import { tone, meter, highlightCommandHints } from "./colors.mjs";
import {
  box,
  boxPaged,
  pagedPlainLines,
  wrap,
  getUiOptions,
  notifyBell,
  waitForChoice3,
  playTestBeep,
  clearTerminalScreen,
  logInfoPauseStep,
  logScreenStep,
  waitForEnterContinue,
  setUiOptions,
} from "./ui.mjs";
import { animateEventLabel, SOUND_TEST_EVENT_LABELS } from "./sound-test.mjs";
import {
  PHISHING_FROM,
  PHISHING_SUBJECTS,
  PHISHING_BODIES_BY_SUBJECT,
  PHISHING_HEADER_LABEL_WIDTH,
  PHISHING_COMPOSE_ANSWER,
} from "./phishing-lure.mjs";
import { t } from "./i18n.mjs";
import { INFO_GLOSSARY } from "./info-glossary.mjs";
import { resolveContactAlias, formatContactTemplate } from "./contact-alias.mjs";
import {
  CLIENT_CHAT_TRIGGERS,
  getContactContractLines,
  getMissionBriefChatMessages,
  isM2HandoffContract,
} from "./client-chat.mjs";
import { animSleep, resetAnimTurbo, isAnimTurbo } from "./anim-sleep-core.mjs";

/** Web build sets `process.env.HKTM_WEB=1` (see web/main.js). */
function isWebUi() {
  try {
    return globalThis.process?.env?.HKTM_WEB === "1";
  } catch {
    return false;
  }
}

/** Animations/spinners/connect theater — must be true in browser even when `process` is unset at chunk load. */
function useAnimEnabled() {
  if (isWebUi()) return true;
  try {
    return Boolean(
      typeof process !== "undefined" &&
        process.stdout?.isTTY &&
        process.env?.NO_ANIM !== "1",
    );
  } catch {
    return false;
  }
}

// Higher = shorter spinner duration + snappier frames. Lower TERM = slower, more readable terminal spinners.
const LOADING_ANIM_SPEED_TERM = 52;
/** Web-only: animation speed vs Node TTY (spinners, connect/scan bars, SSH theater, phishing prelude). */
const WEB_ANIM_SPEED_MULT = 20;

/**
 * Web `?e2e=1` or Node `HKTM_E2E=1` — shorten scripted beats for CI (same intent as Playwright e2e).
 */
function isE2E() {
  try {
    if (typeof process !== "undefined" && process.env?.HKTM_E2E === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return (
      isWebUi() &&
      typeof globalThis.location !== "undefined" &&
      new URLSearchParams(globalThis.location.search).get("e2e") === "1"
    );
  } catch {
    return false;
  }
}

/** Node/CI only (`HKTM_E2E=1`). Browser `?e2e=1` shortens animations but must not skip the spear-phish mission. */
function isCiE2E() {
  try {
    return typeof process !== "undefined" && process.env?.HKTM_E2E === "1";
  } catch {
    return false;
  }
}
const LOADING_ANIM_SPEED_WEB = 220 * WEB_ANIM_SPEED_MULT;

/** Web: SSH theater + link bar wall-clock budget (ms). */
const WEB_CONNECT_SCENE_MAX_MS = Math.floor(14000 / WEB_ANIM_SPEED_MULT);
/** Web: scan theater + SCAN bar — shorter than connect so the shell stays snappy. */
const WEB_SCAN_SCENE_MAX_MS = Math.floor(8000 / WEB_ANIM_SPEED_MULT);

function loadingAnimSpeed() {
  return isWebUi() ? LOADING_ANIM_SPEED_WEB : LOADING_ANIM_SPEED_TERM;
}

function textWrapWidth() {
  const uw = getUiOptions().width;
  return Math.max(40, uw - 4);
}

function indexNodes(nodes) {
  const map = new Map();
  for (const node of nodes) map.set(node.id, node);
  return map;
}

async function runSoundSelfTestNode() {
  console.log(tone("Sound check (terminal BEL) — one beep per event.", "dim"));
  for (const label of SOUND_TEST_EVENT_LABELS) {
    await animateEventLabel(label);
    playTestBeep();
    await animSleep(200);
  }
  console.log(tone("Done.", "dim"));
}

function webLoadingTick() {
  if (!isWebUi() || typeof globalThis.__HKTM_LOADING_TICK !== "function") return;
  try {
    globalThis.__HKTM_LOADING_TICK();
  } catch {
    /* ignore */
  }
}

function webAlarmRise() {
  if (!isWebUi() || typeof globalThis.__HKTM_ALARM_RISE !== "function") return;
  try {
    globalThis.__HKTM_ALARM_RISE();
  } catch {
    /* ignore */
  }
}

function webAlarmReduce() {
  if (!isWebUi() || typeof globalThis.__HKTM_ALARM_REDUCE !== "function") return;
  try {
    globalThis.__HKTM_ALARM_REDUCE();
  } catch {
    /* ignore */
  }
}

async function loading(label, ms, tickOptions = {}) {
  if (!useAnimEnabled() || ms <= 0) return;

  const tickKind = tickOptions.tickKind;
  if (tickKind) globalThis.__HKTM_LOADING_TICK_KIND = tickKind;

  const ui = getUiOptions();
  const sp = loadingAnimSpeed();
  const speed = (ui.mode === "pip" ? 0.55 : 1) / sp;
  let durationMs = Math.max(12, Math.floor(ms * speed));
  if (!isWebUi()) {
    durationMs = Math.max(durationMs, Math.floor(ms * (ui.mode === "pip" ? 0.28 : 0.22)));
  }
  const frameMs = Math.max(8, Math.floor((ui.mode === "pip" ? 55 : 80) / sp));

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const started = Date.now();

  try {
    process.stdout.write(`${tone(frames[0], "cyan")} ${label}`);
    webLoadingTick();
    const timer = setInterval(() => {
      i = (i + 1) % frames.length;
      process.stdout.write(`\r${tone(frames[i], "cyan")} ${label}`);
      webLoadingTick();
    }, frameMs);

    try {
      await animSleep(durationMs);
    } finally {
      clearInterval(timer);
      const elapsed = Date.now() - started;
      process.stdout.write(`\r${tone("✔", "green")} ${label} ${tone(`(${elapsed}ms)`, "dim")}\n`);
      webLoadingTick();
    }
  } finally {
    if (tickKind) delete globalThis.__HKTM_LOADING_TICK_KIND;
  }
}

/** OpenSSH-style host-key prompts; auto-“yes” for pacing. */
async function printSshConnectTheater(toId) {
  const ui = getUiOptions();
  const pace = isWebUi() ? 0.42 / WEB_ANIM_SPEED_MULT : 1;
  const lineMs = Math.max(8, Math.floor((ui.mode === "pip" ? 55 : 75) * pace));
  const fakeIp = `192.0.2.${Math.min(233, 40 + (toId.length % 40))}`;
  const seed = `${toId}|${fakeIp}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const fp = `SHA256:${(h >>> 0).toString(16)}${[...toId].map((c) => c.charCodeAt(0).toString(16)).join("").slice(0, 32)}...`;
  const script = [
    `Connecting to ${toId} port 22...`,
    `The authenticity of host '${toId} (${fakeIp})' can't be established.`,
    `ED25519 key fingerprint is ${fp}`,
    `This key is not known by any other names.`,
    `Are you sure you want to continue connecting (yes/no/[fingerprint])?`,
  ];
  for (const line of script) {
    console.log(tone(line, "dim"));
    await animSleep(lineMs);
  }
  console.log(
    tone("(simulation) ", "dim") +
      tone('typing "yes" — StrictHostKeyChecking policy auto-accepted for this op.', "green"),
  );
  await animSleep(Math.floor((ui.mode === "pip" ? 320 : 240) * pace));
  console.log(
    tone(`Warning: Permanently added '${toId}' (${fakeIp}) to the list of known hosts.`, "yellow"),
  );
  await animSleep(Math.floor((ui.mode === "pip" ? 220 : 160) * pace));
  console.log(
    tone("Enter passphrase for key '/home/operator/.ssh/covert_ed25519': ", "dim") +
      tone("[agent forwarded — empty return]", "green"),
  );
  await animSleep(Math.floor((ui.mode === "pip" ? 380 : 260) * pace));
  console.log(tone(`Last login: simulated session from ${fakeIp}`, "dim"));
  await animSleep(Math.floor((ui.mode === "pip" ? 140 : 100) * pace));
}

/**
 * Long, staged “covert link” animation when pivoting to another node (PIP runs longer).
 */
async function connectRouteAnimation(fromId, toId) {
  if (!useAnimEnabled()) return;

  const ui = getUiOptions();
  const connectSceneStart = Date.now();
  await printSshConnectTheater(toId);
  const sshElapsed = Date.now() - connectSceneStart;
  const baseBarMs = Math.floor(
    (ui.mode === "pip" ? 5200 : 3400) * (isWebUi() ? 0.48 / WEB_ANIM_SPEED_MULT : 1),
  );
  let totalMs = baseBarMs;
  if (isWebUi()) {
    const reserveFinalMs = 140;
    const remaining = WEB_CONNECT_SCENE_MAX_MS - sshElapsed - reserveFinalMs;
    totalMs = Math.min(baseBarMs, Math.max(0, remaining));
    if (totalMs < (isWebUi() ? 450 : 900)) totalMs = Math.min(baseBarMs, isWebUi() ? 450 : 900);
  }
  const phases = [
    "Negotiating ephemeral session keys (forward secrecy…)",
    "Mesh relay handshake — timing jitter matched to cover traffic…",
    "Tunneling hop-by-hop through the graph edge…",
    `Routing fabric: ${fromId} → ${toId}`,
    "Binding remote shell to virtual console…",
    "Cryptographic transcript verified — stabilizing link…",
  ];
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const frameMs = Math.max(8, Math.floor((ui.mode === "pip" ? 55 : 80) / loadingAnimSpeed()));
  const clearPad = Math.min(140, Math.max(80, (ui.width ?? 74) + 36));
  const start = Date.now();
  let tick = 0;

  const truncate = (s, max) => (s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`);

  while (Date.now() - start < totalMs) {
    if (isAnimTurbo()) break;
    tick += 1;
    const elapsed = Date.now() - start;
    const p = Math.min(1, elapsed / totalMs);
    const phaseIdx = Math.min(phases.length - 1, Math.floor(p * phases.length));
    const barW = 32;
    const filled = Math.round(p * barW);
    const bar = "█".repeat(filled) + "░".repeat(Math.max(0, barW - filled));
    const pct = Math.floor(p * 100);
    const f = frames[tick % frames.length];
    const cols =
      typeof process.stdout.columns === "number" && process.stdout.columns > 0
        ? process.stdout.columns
        : 100;
    const maxPhase = Math.max(24, cols - 54);
    const phase = truncate(phases[phaseIdx], maxPhase);
    const line = `${tone(f, "cyan")} ${tone("LINK", "magenta")} [${tone(bar, "green")}] ${tone(String(pct).padStart(3), "yellow")}%  ${tone(phase, "dim")}`;
    process.stdout.write(`\r${line}`);
    // No webLoadingTick here: same samples as typing/page in the web shell and reads as "rendering" over the link bar.
    // eslint-disable-next-line no-await-in-loop
    await animSleep(frameMs);
  }

  tick += 1;
  const f = frames[tick % frames.length];
  const bar = "█".repeat(32);
  const cols =
    typeof process.stdout.columns === "number" && process.stdout.columns > 0
      ? process.stdout.columns
      : 100;
  const maxPhase = Math.max(24, cols - 54);
  const phase = truncate(phases[phases.length - 1], maxPhase);
  process.stdout.write(
    `\r${tone(f, "cyan")} ${tone("LINK", "magenta")} [${tone(bar, "green")}] ${tone("100", "yellow")}%  ${tone(phase, "dim")}`,
  );
  await animSleep(isWebUi() ? 16 : 160);
  process.stdout.write("\r" + " ".repeat(clearPad) + "\r");
}

/** Staged [scan] lines (passive discovery) — pacing mirrors OpenSSH-style connect theater. */
async function printScanDiscoveryTheater(currentNodeId) {
  const ui = getUiOptions();
  const pace = isWebUi() ? 0.42 / WEB_ANIM_SPEED_MULT : 1;
  const lineMs = Math.max(8, Math.floor((ui.mode === "pip" ? 55 : 75) * pace));
  const script = [
    `[scan] Passive neighbor discovery — no payloads sent to targets…`,
    `[scan] Reading footholds + current position (${currentNodeId}) — expanding edge set…`,
    `[scan] Cross-referencing mission graph (single-hop adjacency)…`,
    `[scan] Tagging hosts (undiscovered vs fingerprinted)…`,
    `[scan] Compiling ordered host list…`,
  ];
  for (const line of script) {
    console.log(tone(line, "dim"));
    await animSleep(lineMs);
  }
  await animSleep(Math.floor((ui.mode === "pip" ? 200 : 140) * pace));
}

/**
 * `scan`: scripted steps + SCAN progress bar (same spirit as connect’s SSH lines + LINK bar).
 */
async function scanNetworkAnimation(currentNodeId) {
  if (!useAnimEnabled()) return;

  const scanSceneStart = Date.now();
  await printScanDiscoveryTheater(currentNodeId);
  const theaterElapsed = Date.now() - scanSceneStart;

  const ui = getUiOptions();
  const baseBarMs = Math.floor(
    (ui.mode === "pip" ? 3200 : 2400) * (isWebUi() ? 0.48 / WEB_ANIM_SPEED_MULT : 1),
  );
  let totalMs = baseBarMs;
  if (isWebUi()) {
    const reserveFinalMs = 140;
    const remaining = WEB_SCAN_SCENE_MAX_MS - theaterElapsed - reserveFinalMs;
    totalMs = Math.min(baseBarMs, Math.max(0, remaining));
    if (totalMs < (isWebUi() ? 400 : 800)) totalMs = Math.min(baseBarMs, isWebUi() ? 400 : 800);
  }
  const phases = [
    "Sweeping local link graph…",
    "Enumerating neighbors from each foothold…",
    "Matching host labels to mission nodes…",
    "Deduping & sorting candidates…",
    "Passive sweep complete — finalizing…",
  ];
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const frameMs = Math.max(8, Math.floor((ui.mode === "pip" ? 55 : 80) / loadingAnimSpeed()));
  const clearPad = Math.min(140, Math.max(80, (ui.width ?? 74) + 36));
  const start = Date.now();
  let tick = 0;

  const truncate = (s, max) => (s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`);

  while (Date.now() - start < totalMs) {
    if (isAnimTurbo()) break;
    tick += 1;
    const elapsed = Date.now() - start;
    const p = Math.min(1, elapsed / totalMs);
    const phaseIdx = Math.min(phases.length - 1, Math.floor(p * phases.length));
    const barW = 32;
    const filled = Math.round(p * barW);
    const bar = "█".repeat(filled) + "░".repeat(Math.max(0, barW - filled));
    const pct = Math.floor(p * 100);
    const f = frames[tick % frames.length];
    const cols =
      typeof process.stdout.columns === "number" && process.stdout.columns > 0
        ? process.stdout.columns
        : 100;
    const maxPhase = Math.max(24, cols - 54);
    const phase = truncate(phases[phaseIdx], maxPhase);
    const line = `${tone(f, "cyan")} ${tone("SCAN", "magenta")} [${tone(bar, "green")}] ${tone(String(pct).padStart(3), "yellow")}%  ${tone(phase, "dim")}`;
    process.stdout.write(`\r${line}`);
    // eslint-disable-next-line no-await-in-loop
    await animSleep(frameMs);
  }

  tick += 1;
  const f = frames[tick % frames.length];
  const bar = "█".repeat(32);
  const cols =
    typeof process.stdout.columns === "number" && process.stdout.columns > 0
      ? process.stdout.columns
      : 100;
  const maxPhase = Math.max(24, cols - 54);
  const phase = truncate(phases[phases.length - 1], maxPhase);
  process.stdout.write(
    `\r${tone(f, "cyan")} ${tone("SCAN", "magenta")} [${tone(bar, "green")}] ${tone("100", "yellow")}%  ${tone(phase, "dim")}`,
  );
  await animSleep(isWebUi() ? 16 : 160);
  process.stdout.write("\r" + " ".repeat(clearPad) + "\r");

  const elapsedTotal = Date.now() - scanSceneStart;
  console.log(
    `${tone("✔", "green")} ${tone("Neighbor scan complete.", "dim")} ${tone(`(${elapsedTotal}ms)`, "dim")}`,
  );
  webLoadingTick();
}

function isConnected(mission, fromId, toId) {
  return mission.edges.some(
    (e) => (e[0] === fromId && e[1] === toId) || (e[1] === fromId && e[0] === toId),
  );
}

function reachableFromOwned(mission, ownedNodes, targetNode) {
  if (ownedNodes.has(targetNode)) return true;
  for (const owned of ownedNodes) {
    if (isConnected(mission, owned, targetNode)) return true;
  }
  return false;
}

/** Probe target may be 2+ hops away: expand through discovered nodes from owned footholds (not only direct owned→target). */
function probeReachable(mission, ownedNodes, discoveredNodes, targetNode) {
  if (ownedNodes.has(targetNode)) return true;
  for (const o of ownedNodes) {
    if (isConnected(mission, o, targetNode)) return true;
  }
  const queue = [...ownedNodes];
  const seen = new Set(ownedNodes);
  while (queue.length) {
    const u = queue.shift();
    for (const [a, b] of mission.edges) {
      const v = a === u ? b : b === u ? a : null;
      if (!v) continue;
      if (!discoveredNodes.has(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      queue.push(v);
    }
  }
  for (const u of seen) {
    if (isConnected(mission, u, targetNode)) return true;
  }
  return false;
}

function rollSocAlert(nodeId, command, risk, turns) {
  if (risk <= 0) return null;
  const deterministic = (nodeId.length * 31 + command.length * 17 + turns * 13) % 100;
  if (deterministic < 28) {
    return {
      severity: risk >= 5 ? "high" : "medium",
      turnsRemaining: risk >= 5 ? 2 : 3,
      reason:
        risk >= 5
          ? "SOC anomaly model flagged exploit-level packet burst."
          : "Behavior analytics noticed unusual service probing pattern.",
    };
  }
  return null;
}

/** Mission JSON `emails[]` → in-game inbox (read state is serialized). */
function mailFromMission(mission) {
  const emails = mission.emails;
  if (!Array.isArray(emails)) return [];
  return emails.map((e) => ({
    id: String(e.id),
    from: String(e.from ?? "unknown"),
    subject: String(e.subject ?? "(no subject)"),
    body: String(e.body ?? ""),
    read: false,
  }));
}

export function createMissionSession(mission, initialSnapshot = null, sessionOptions = {}) {
  if (mission?.id === "m1-ghost-proxy") {
    const m1DefaultGates = [
      {
        from: "local",
        to: "gw-edge",
        afterExploit: { node: "local", exploitId: "weak-ssh" },
      },
      {
        from: "gw-edge",
        to: "app-api",
        afterExploit: { node: "gw-edge", exploitId: "weak-ssh" },
      },
    ];
    if (!Array.isArray(mission.connectGates)) mission.connectGates = [];
    for (const g of m1DefaultGates) {
      const has = mission.connectGates.some((x) => x.from === g.from && x.to === g.to);
      if (!has) mission.connectGates.push(g);
    }
  }
  const nodeById = indexNodes(mission.nodes);

  const contactAliasSeed =
    sessionOptions.contactAliasSeed ?? initialSnapshot?.contactAliasSeed ?? "hktm-default";
  const contactAlias = resolveContactAlias(contactAliasSeed);
  const missionIndex = sessionOptions.missionIndex ?? 0;
  const missionTotal = sessionOptions.missionTotal ?? 1;
  const composeMailReadyCheckpoint = sessionOptions.composeMailReadyCheckpoint === true;
  /** @type {undefined | ((runDefault: () => Promise<void>) => Promise<void>)} */
  const afterInfoRestore = sessionOptions.afterInfoRestore;

  /** Campaign / browser pass an explicit boolean; omit in tests → no progressive lock. */
  const shadowNetImIntroCompletedOpt = sessionOptions.shadowNetImIntroCompleted;
  const skipM1ToolLock = sessionOptions.skipM1ToolLock === true;

  function shouldApplyM1ToolLock() {
    if (mission.id !== "m1-ghost-proxy" || skipM1ToolLock) return false;
    return shadowNetImIntroCompletedOpt !== undefined;
  }

  /**
   * @returns {null | 0 | 1 | 2} null = full command set (non-m1, tests, or skip)
   */
  function getM1ToolTier() {
    if (!shouldApplyM1ToolLock()) return null;
    if (state.phishingBeatDone) return 2;
    if (shadowNetImIntroCompletedOpt === true) return 1;
    if (isWebUi() && globalThis.__HKTM_SHADOW_NET_IM_INTRO_COMPLETED === true) return 1;
    return 0;
  }

  /**
   * @param {string} c
   * @param {string} arg
   */
  function isM1CommandUnlocked(c, arg) {
    const tier = getM1ToolTier();
    if (tier === null || tier === 2) return true;
    const a = String(arg ?? "").trim().toLowerCase();
    /* Tier 0/1 (before phishing beat): mail + compose so the brief is actionable without IM first. */
    if (tier === 0 || tier === 1) {
      if (c === "help" || c === "clear" || c === "chat" || c === "info" || c === "quit") return true;
      if (c === "mail" || c === "sendmail" || c === "/brief" || c === "status") return true;
      if (c === "compose" && a.startsWith("mail")) return true;
      if (c === "test" && a === "sound") return true;
      return false;
    }
  }

  /** Tab-completion filter for progressive m1 unlock (game readline). */
  function isTabCommandAllowed(cmd) {
    const tier = getM1ToolTier();
    if (tier === null || tier === 2) return true;
    const lower = String(cmd ?? "").toLowerCase().trim();
    const tier01Base =
      ["help", "clear", "chat", "chat close", "quit"].includes(lower) ||
      lower === "info" ||
      lower.startsWith("info ");
    const tier01Mail =
      tier01Base ||
      lower.startsWith("mail") ||
      lower.startsWith("compose mail") ||
      lower === "/brief" ||
      lower === "status" ||
      lower.startsWith("status ") ||
      lower.startsWith("test ");
    if (tier === 0 || tier === 1) return tier01Mail;
    return true;
  }

  let pendingChatNotifications = 0;

  function webGhostChatTrigger(id, extra = {}) {
    const trig = CLIENT_CHAT_TRIGGERS[id];
    if (!trig) return;
    const line = formatContactTemplate(trig.text, contactAlias);
    const sender = trig.sender ?? "client";
    if (isWebUi() && typeof globalThis.__HKTM_GHOST_CHAT_HOOK === "function") {
      try {
        globalThis.__HKTM_GHOST_CHAT_HOOK({
          id,
          missionId: mission.id,
          text: line,
          sender,
          contactTag: contactAlias.tag,
          ...extra,
        });
      } catch {
        /* ignore */
      }
      return;
    }
    if (!isWebUi()) {
      pendingChatNotifications += 1;
    }
  }

  function flushChatNotification() {
    if (pendingChatNotifications <= 0) return;
    const n = pendingChatNotifications;
    pendingChatNotifications = 0;
    const label =
      n === 1
        ? "New message in ShadowNet IM."
        : `${n} new messages in ShadowNet IM.`;
    console.log("");
    console.log(
      `${tone(">", "dim")} ${tone(label, "green")} ${tone("Type ", "dim")}${tone("chat", "cyan")}${tone(" to open.", "dim")}`,
    );
  }

  const state = {
    mission,
    nodeById,
    currentNode: mission.startNode,
    ownedNodes: new Set([mission.startNode]),
    discoveredNodes: new Set([mission.startNode]),
    enumerated: new Set(),
    exfiltrated: new Set(),
    artifacts: new Set(),
    trace: 0,
    turns: 0,
    socAlert: null,
    lastCommand: null,
    lastArg: null,
    finished: false,
    result: "in_progress",
    exploitGatesMet: new Set(),
    mail: mailFromMission(mission),
    ghostTriggers: {
      edgeListed: false,
      probeGw: false,
      onGw: false,
      socAlert: false,
      amandaTraceGuarded: false,
      amandaTracePressure: false,
      amandaTraceCritical: false,
      amandaSocPersonal: false,
    },
    phishingBeatDone: false,
    contactContractShownInTerminal: false,
  };

  if (initialSnapshot) {
    state.currentNode = initialSnapshot.currentNode ?? state.currentNode;
    state.ownedNodes = new Set(initialSnapshot.ownedNodes ?? [mission.startNode]);
    state.discoveredNodes = new Set(initialSnapshot.discoveredNodes ?? [mission.startNode]);
    state.enumerated = new Set(initialSnapshot.enumerated ?? []);
    state.exfiltrated = new Set(initialSnapshot.exfiltrated ?? []);
    state.artifacts = new Set(initialSnapshot.artifacts ?? []);
    state.trace = Number(initialSnapshot.trace ?? 0);
    state.turns = Number(initialSnapshot.turns ?? 0);
    state.socAlert = initialSnapshot.socAlert ?? null;
    state.lastCommand = initialSnapshot.lastCommand ?? null;
    state.lastArg = initialSnapshot.lastArg ?? null;
    state.finished = Boolean(initialSnapshot.finished);
    state.result = initialSnapshot.result ?? "in_progress";
    state.exploitGatesMet = new Set(initialSnapshot.exploitGatesMet ?? []);
    if (Array.isArray(initialSnapshot.mailState)) {
      const readMap = new Map(initialSnapshot.mailState.map((x) => [x.id, x.read]));
      for (const m of state.mail) {
        if (readMap.has(m.id)) m.read = Boolean(readMap.get(m.id));
      }
    }
    if (initialSnapshot.ghostTriggers && typeof initialSnapshot.ghostTriggers === "object") {
      Object.assign(state.ghostTriggers, initialSnapshot.ghostTriggers);
    }
  }

  function syncAmandaGhostHintFlags() {
    const max = mission.security.maxTrace;
    const ratio = max > 0 ? state.trace / max : 0;
    if (ratio >= 0.25) state.ghostTriggers.amandaTraceGuarded = true;
    if (ratio >= 0.5) state.ghostTriggers.amandaTracePressure = true;
    if (ratio >= 0.75) state.ghostTriggers.amandaTraceCritical = true;
    if (state.socAlert) state.ghostTriggers.amandaSocPersonal = true;
  }
  syncAmandaGhostHintFlags();

  state.phishingBeatDone = initialSnapshot?.phishingBeatDone === true;
  if (!state.phishingBeatDone && state.exploitGatesMet.has("local:weak-ssh")) {
    state.phishingBeatDone = true;
  }
  if (isCiE2E() && mission.id === "m1-ghost-proxy") {
    state.phishingBeatDone = true;
  }
  state.contactContractShownInTerminal = initialSnapshot?.contactContractShownInTerminal === true;

  async function showContactChatSession() {
    const m2Handoff = isM2HandoffContract(mission, missionIndex);
    const openScene = m2Handoff ? "chat-session-m2-handoff-open" : "chat-session-open";
    const contractScene = m2Handoff ? "chat-contract-m2-handoff" : "chat-contract";
    const closeScene = m2Handoff ? "chat-session-m2-handoff-close" : "chat-session-close";
    if (!isWebUi()) clearTerminalScreen(openScene);
    const flat = [];
    for (const line of getContactContractLines(mission, contactAlias, { missionIndex, missionTotal })) {
      if (line === "") flat.push("");
      else flat.push(...wrap(line, textWrapWidth()));
    }
    const webSkipContractPager = isWebUi() && state.contactContractShownInTerminal;
    if (!webSkipContractPager) {
      await boxPaged(
        tone(`${contactAlias.tag} — ShadowNet IM`, "bold"),
        flat,
        getUiOptions().width,
        t("pager_help_line"),
        contractScene,
      );
      if (isWebUi()) state.contactContractShownInTerminal = true;
    }
    if (!isWebUi()) clearTerminalScreen(closeScene);
    if (isWebUi()) globalThis.__HKTM_GHOST_CHAT_OPEN?.({ forced: false });
  }

  function addTrace(amount) {
    state.trace = Math.min(mission.security.maxTrace, state.trace + amount);
  }

  function maybeTriggerSoc(command, risk) {
    if (state.socAlert || risk <= 0) return;
    // Defensive / cleanup actions should not roll a fresh SOC alert the same turn.
    if (command === "spoof" || command === "laylow" || command === "cover" || command === "sql") return;
    const alert = rollSocAlert(state.currentNode, command, risk, state.turns);
    if (alert) {
      state.socAlert = alert;
      if (!isWebUi()) {
        console.log(`${tone("[SOC]", "red")} ${tone(alert.reason, "yellow")}`);
      }
      if (!state.ghostTriggers.socAlert) {
        state.ghostTriggers.socAlert = true;
        webGhostChatTrigger("soc_alert", { severity: alert.severity });
      }
      /* Alarm plays once in showStatus() when “SOC Alert:” line prints (after long cmds, Web Audio resume is reliable). */
    }
  }

  function progressSocAlert() {
    if (!state.socAlert) return;
    state.socAlert.turnsRemaining -= 1;
    if (state.socAlert.turnsRemaining <= 0) {
      const penalty = state.socAlert.severity === "high" ? 3 : 2;
      addTrace(penalty);
      if (!isWebUi()) {
        console.log(
          `${tone("[SOC]", "red")} Alert escalated. Additional trace +${penalty}.`,
        );
      } else {
        webGhostChatTrigger("soc_escalation", {
          text: `SOC escalated: +${penalty} trace applied to your session. Edge policy may lock you out if this keeps climbing. — ORION·INT`,
        });
      }
      webAlarmRise();
      state.socAlert = null;
    }
  }

  function node(id) {
    return nodeById.get(id);
  }

  function connectGateForHop(fromId, toId) {
    const gates = mission.connectGates ?? [];
    return gates.find((g) => g.from === fromId && g.to === toId) ?? null;
  }

  /** True when `connect` from → to exists in the graph but a prerequisite exploit is not yet met. */
  function connectHopBlocked(fromId, toId) {
    const gate = connectGateForHop(fromId, toId);
    if (!gate?.afterExploit) return { blocked: false, gate: null };
    const { node: gateNode, exploitId } = gate.afterExploit;
    const key = `${gateNode}:${exploitId}`;
    if (state.exploitGatesMet.has(key)) return { blocked: false, gate };
    return { blocked: true, gate };
  }

  function serviceProtocol(s) {
    return String(s.protocol ?? "tcp").toLowerCase();
  }

  /** SSH listener heuristic for probe table (mission may still set explicit exploitId). */
  function serviceLooksLikeSsh(s) {
    const name = String(s.name ?? "").toLowerCase();
    if (name === "ssh") return true;
    const port = Number(s.port);
    return port === 22 && serviceProtocol(s) === "tcp";
  }

  /**
   * Best-effort exploit id hint for remote sweep table (not enum output).
   * Uses mission `exploitId` when present; otherwise common SSH → weak-ssh heuristic.
   */
  function probeGuessExploitId(s) {
    const id = s.exploitId != null ? String(s.exploitId).trim() : "";
    if (id) return id;
    if (serviceLooksLikeSsh(s)) return "weak-ssh";
    return "";
  }

  /** Remote port sweep after `probe <host>` — open ports + guesses only; no CVE/exploit mapping (that is `enum` on-host). */
  function printPortSweep(hostId, n) {
    /** Fixed widths so header row and data rows align in monospace (plain spacing was shorter than padded col1). */
    const W_PORT = 22;
    const W_STATE = 8;
    const W_NOTE = 28;
    const W_GUESS = 22;

    const svcs = n.services ?? [];
    if (svcs.length === 0) {
      console.log(tone(`No exposed listener ports on ${hostId} (passive / local).`, "dim"));
      return;
    }
    console.log(
      `\n${tone(`Remote port sweep — ${hostId}`, "bold")}  ${tone("(from your foothold; no shell on target yet)", "dim")}`,
    );
    console.log(
      `${tone("PORT/PROTO".padEnd(W_PORT), "dim")} ${tone("STATE".padEnd(W_STATE), "dim")} ${tone("REMOTE NOTE".padEnd(W_NOTE), "dim")} ${tone("LIKELY EXPLOIT (guess)".padEnd(W_GUESS), "dim")}`,
    );
    for (const s of svcs) {
      const p = `${s.port}/${serviceProtocol(s)}`;
      const svcName = s.name ?? "?";
      const label = `${p} ${svcName}`;
      const guessId = probeGuessExploitId(s);
      const guessCol =
        guessId !== ""
          ? tone(guessId.padEnd(W_GUESS), "yellow")
          : tone("—".padEnd(W_GUESS), "dim");
      console.log(
        `${tone(label.padEnd(W_PORT), "cyan")} ${tone("open".padEnd(W_STATE), "green")} ${tone("listener / banner guess only".padEnd(W_NOTE), "dim")} ${guessCol}`,
      );
    }
    console.log(
      highlightCommandHints(
        "Last column is a fingerprint guess, not enum output — confirm with enum after connect. Probe does not map full CVE classes — that requires an on-host session. Flow: discover (scan) → remote sweep (probe) → connect → enum → exploit (then pivot, cat intel, stash artifacts, or chain e.g. SQL → creds → another host).",
      ),
    );
    const hop = connectHopBlocked(state.currentNode, hostId);
    if (hop.blocked && hop.gate?.afterExploit) {
      const g = hop.gate.afterExploit;
      console.log(
        `\n${tone("Tip:", "dim")} ${highlightCommandHints(`connect ${hostId} is blocked until exploit ${g.exploitId} on ${g.node} (staging). After the hop: enum on ${hostId} for exploit <id> mapping.`)}`,
      );
    } else {
      console.log(
        `\n${tone("Tip:", "dim")} ${highlightCommandHints(`connect ${hostId}, then enum on that host to list exploit <id> per port before exploit.`)}`,
      );
    }
  }

  /**
   * Pull up to N sentence-like chunks (…[.!?]) from flattened text; remainder means more content exists.
   */
  function takeUpToSentences(flat, maxSentences) {
    let rest = flat.trim();
    const parts = [];
    for (let i = 0; i < maxSentences && rest; i += 1) {
      const m = rest.match(/^(.+?[.!?])(?:\s+|$)/);
      if (m) {
        parts.push(m[1].trim());
        rest = rest.slice(m[0].length).trim();
      } else {
        parts.push(rest);
        rest = "";
      }
    }
    return { text: parts.join(" ").trim(), truncatedBySentence: rest.length > 0 };
  }

  /**
   * One-line menu / verdict preview: 1 sentence (subject/from) or 2 sentences (body) when present,
   * then "..." if more text remains or if hard-truncated to maxLen.
   */
  function previewPhishingOptionLabel(label, maxLen, options = {}) {
    const maxSentences = options.maxSentences ?? 1;
    const flat = String(label).replace(/\s+/g, " ").trim();
    const { text: base, truncatedBySentence } = takeUpToSentences(flat, maxSentences);
    let s = base;
    if (truncatedBySentence) s = `${s}...`;
    if (s.length > maxLen) s = `${s.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
    return s;
  }

  /** @param {boolean} [dimmed] — already-declined option (grayed out in the menu). */
  function logPhishingOption(n, option, cw, dimmed = false, stepKind = "subject") {
    const inner = Math.max(24, cw - 6);
    const maxSentences = stepKind === "body" ? 2 : 1;
    const line = previewPhishingOptionLabel(option.label, inner, { maxSentences });
    const numTone = dimmed ? "dim" : "cyan";
    const textTone = dimmed ? "dim" : "yellow";
    console.log(`  ${tone(`[${n}]`, numTone)} ${tone(line, textTone)}`);
  }

  async function runPhishingLureSequence() {
    const cw = textWrapWidth();
    const pickHint = isWebUi()
      ? "Press 1, 2, or 3."
      : "Type 1, 2, or 3 and press Enter.";

    function stepKindTitle(stepKind) {
      if (stepKind === "subject") return "Subject";
      if (stepKind === "body") return "Body";
      return "From";
    }

    /** Correct pick: headline, feedback lines, real-world example, then caller pauses. */
    function printApproved(stepKind, choice, cw) {
      clearTerminalScreen(`compose-mail-${stepKind}-approved`, "clear");
      const head = stepKindTitle(stepKind);
      const fb = choice.feedback;
      const maxSentences = stepKind === "body" ? 2 : 1;
      const pickedPreview = previewPhishingOptionLabel(choice.label, Math.max(40, cw - 4), {
        maxSentences,
      });
      console.log("");
      if (stepKind === "body") {
        console.log(tone(`${head} approved.`, "green"));
        console.log("");
        for (const row of wrap(pickedPreview, cw)) {
          console.log(tone(row, "green"));
        }
        console.log("");
      } else {
        const headline = `${head} approved: ${pickedPreview}`;
        for (const row of wrap(headline, cw)) {
          console.log(tone(row, "green"));
        }
        console.log("");
      }
      for (const p of fb.lines) {
        for (const row of wrap(p, cw)) {
          console.log(tone(row, "dim"));
        }
      }
      if (fb.history) {
        console.log("");
        console.log(tone("Real-world example", "bold"));
        console.log(tone(fb.history.label, "magenta"));
        for (const row of wrap(fb.history.detail, cw)) {
          console.log(tone(row, "dim"));
        }
      }
      console.log("");
    }

    /** Strip leading "Declined:" so it does not repeat the Subject/Body/From declined headline. */
    function stripDeclinedLead(s) {
      return String(s ?? "")
        .replace(/^Declined:\s*/i, "")
        .trim();
    }

    /** Wrong pick: headline, mission reason, feedback + optional history, then caller pauses. */
    function printDeclined(stepKind, choice, rejectReason, cw) {
      clearTerminalScreen(`compose-mail-${stepKind}-declined`, "clear");
      const head = stepKindTitle(stepKind);
      const fb = choice.feedback;
      const missionWhy = stripDeclinedLead(rejectReason);
      const maxSentences = stepKind === "body" ? 2 : 1;
      const pickedPreview = previewPhishingOptionLabel(choice.label, Math.max(40, cw - 4), {
        maxSentences,
      });
      console.log("");
      if (stepKind === "body") {
        console.log(tone(`${head} declined.`, "red"));
        console.log("");
        for (const row of wrap(pickedPreview, cw)) {
          console.log(tone(row, "red"));
        }
        console.log("");
      } else {
        const headline = `${head} declined: ${pickedPreview}`;
        for (const row of wrap(headline, cw)) {
          console.log(tone(row, "red"));
        }
        console.log("");
      }
      if (missionWhy) console.log(tone(missionWhy, "yellow"));
      if (missionWhy) console.log("");
      for (const p of fb.lines) {
        for (const row of wrap(p, cw)) {
          console.log(tone(row, "dim"));
        }
      }
      if (fb.history) {
        console.log("");
        console.log(tone("Real-world example", "bold"));
        console.log(tone(fb.history.label, "magenta"));
        for (const row of wrap(fb.history.detail, cw)) {
          console.log(tone(row, "dim"));
        }
      }
      console.log("");
      console.log(
        tone(
          "Only one option passes this simulation gate. Pick the mission-correct lure component to continue.",
          "dim",
        ),
      );
      console.log("");
    }

    function rejectExplain(stepKind, pickedIdx, subjectIdx = null) {
      if (stepKind === "subject") {
        if (pickedIdx === 0) {
          return "Declined: panic/lockout urgency is noisy and easy for users to flag in this campaign.";
        }
        if (pickedIdx === 2) {
          return "Declined: gift-card bait reads as commodity spam, not believable enterprise IT workflow.";
        }
      }
      if (stepKind === "body") {
        if (subjectIdx === PHISHING_COMPOSE_ANSWER.subjectIdx && pickedIdx === 0) {
          return "Declined: this body explicitly avoids links, so it cannot deliver a credential-harvesting lure.";
        }
        if (subjectIdx === PHISHING_COMPOSE_ANSWER.subjectIdx && pickedIdx === 2) {
          return "Declined: chain-forward + employee-ID requests are low-credibility and trip suspicion quickly.";
        }
        return "Declined: this body does not match the required lure mechanics for this scenario.";
      }
      if (stepKind === "from") {
        if (pickedIdx === 1) {
          return "Declined: while internal company domains are spoofable, it's unlikely this lure profile would use a fully legitimate internal sender address.";
        }
        if (pickedIdx === 2) {
          return "Declined: freemail sender is too obvious for targeted enterprise phishing.";
        }
      }
      return "Declined: this option is not valid for the mission's single accepted lure path.";
    }

    async function pickCorrectOption(stepLabel, stepKind, options, checkCorrect, subjectIdx = null, formSceneName = "compose-mail") {
      const rejected = new Set();
      for (;;) {
        clearTerminalScreen(formSceneName, "form");
        console.log("");
        console.log(tone(`${stepLabel}:`, "bold"));
        for (let i = 0; i < options.length; i += 1) {
          logPhishingOption(i + 1, options[i], cw, rejected.has(i), stepKind);
        }
        console.log("");
        let idx;
        for (;;) {
          const pick = await waitForChoice3(pickHint);
          idx = Math.min(2, Math.max(0, pick - 1));
          if (rejected.has(idx)) {
            console.log("");
            console.log(tone("That option was already declined. Pick a different number.", "yellow"));
            console.log("");
            continue;
          }
          break;
        }
        const choice = options[idx];
        if (checkCorrect(idx)) {
          printApproved(stepKind, choice, cw);
          await waitForEnterContinue(t("press_enter_continue"));
          return { idx, choice };
        }
        printDeclined(stepKind, choice, rejectExplain(stepKind, idx, subjectIdx), cw);
        await waitForEnterContinue(t("press_enter_continue"));
        rejected.add(idx);
      }
    }

    let subjectIdx;
    let subjectChoice;
    let bodyIdx;
    let bodyChoice;
    let fromIdx;
    let fromChoice;

    if (composeMailReadyCheckpoint) {
      subjectIdx = PHISHING_COMPOSE_ANSWER.subjectIdx;
      subjectChoice = PHISHING_SUBJECTS[subjectIdx];
      bodyIdx = PHISHING_COMPOSE_ANSWER.bodyIdxBySubject[subjectIdx] ?? 1;
      bodyChoice = PHISHING_BODIES_BY_SUBJECT[subjectIdx][bodyIdx];
      fromIdx = PHISHING_COMPOSE_ANSWER.fromIdx;
      fromChoice = PHISHING_FROM[fromIdx];
    } else {
      // --- Step 1: Subject ---
      const subjectPick = await pickCorrectOption(
        "Step 1/3 — Subject",
        "subject",
        PHISHING_SUBJECTS,
        (idx) => idx === PHISHING_COMPOSE_ANSWER.subjectIdx,
      );
      subjectIdx = subjectPick.idx;
      subjectChoice = subjectPick.choice;

      // --- Step 2: Body (linked to chosen subject) ---
      const bodies = PHISHING_BODIES_BY_SUBJECT[subjectIdx];
      const requiredBodyIdx = PHISHING_COMPOSE_ANSWER.bodyIdxBySubject[subjectIdx] ?? -1;
      const bodyPick = await pickCorrectOption(
        "Step 2/3 — Body",
        "body",
        bodies,
        (idx) => idx === requiredBodyIdx,
        subjectIdx,
        "compose-mail-body",
      );
      bodyIdx = bodyPick.idx;
      bodyChoice = bodyPick.choice;

      // --- Step 3: From ---
      const fromPick = await pickCorrectOption(
        "Step 3/3 — From",
        "from",
        PHISHING_FROM,
        (idx) => idx === PHISHING_COMPOSE_ANSWER.fromIdx,
        null,
        "compose-mail-from",
      );
      fromIdx = fromPick.idx;
      fromChoice = fromPick.choice;
    }

    clearTerminalScreen("compose-mail-prepare");
    await waitForEnterContinue("Preparation ready. Press ENTER to compose and send");

    // Web + non-animated / non-TTY runs use short delays; interactive terminal with animations gets very slow compose.
    const fast = isWebUi() || !useAnimEnabled();
    const d = (ms) => (fast ? Math.max(8, Math.floor(ms * 0.3)) : ms);
    const charMs = fast ? 4 : 38;
    const lineMs = fast ? 12 : 65;
    // OUTBOUND LURE: base ms/char; scaled down as section grows so long blocks stay tolerable.
    const baseComposeCharMs = fast ? 1 : 11;
    /** Chars at which per-char delay starts easing (longer sections → faster per char). */
    const COMPOSE_SECTION_REF_CHARS = 120;
    const composeDraftPauseMs = fast ? 36 : 366;

    /** Extra divisor for body field lines (on top of section size scaling). */
    const COMPOSE_BODY_SPEED_MULT = 250;
    /** Body value: one sleep every N non-space chars (10× effective speed vs per-char when delay is 1 ms). */
    const BODY_VALUE_CHARS_PER_TICK = 10;

    /**
     * @param {number} charCount Approximate characters typed in this section (including padding).
     * @param {{ bodyBoost?: boolean }} [opts] Body value uses `COMPOSE_BODY_SPEED_MULT`× faster when not in fast mode.
     */
    function computeComposeCharDelay(charCount, opts = {}) {
      const { bodyBoost = false } = opts;
      // With baseComposeCharMs === 1, bodyBoost ÷25 still yields 1 — same as Subject. Split explicitly in fast mode.
      if (fast) {
        if (bodyBoost) return 1;
        return 2;
      }
      const n = Math.max(1, charCount);
      const sizeScale = COMPOSE_SECTION_REF_CHARS / Math.max(COMPOSE_SECTION_REF_CHARS, n);
      let ms = Math.max(1, Math.floor(baseComposeCharMs * sizeScale));
      if (bodyBoost) {
        ms = Math.max(1, Math.floor(ms / COMPOSE_BODY_SPEED_MULT));
      }
      return ms;
    }

    /** Split plain text into alternating segments for `https?://…` URLs (compose preview). */
    function splitTextWithHttpUrls(value) {
      const parts = [];
      const re = /https?:\/\/[^\s]+/g;
      let last = 0;
      let m;
      while ((m = re.exec(value)) !== null) {
        if (m.index > last) {
          parts.push({ text: value.slice(last, m.index), link: false });
        }
        parts.push({ text: m[0], link: true });
        last = m.index + m[0].length;
      }
      if (last < value.length) {
        parts.push({ text: value.slice(last), link: false });
      }
      if (parts.length === 0) {
        parts.push({ text: value, link: false });
      }
      return parts;
    }

    /**
     * @param {"cyan" | "yellow" | "dim"} baseToneName
     * @param {boolean} highlightUrls
     * @param {number} delayMs
     */
    async function typeComposeValue(value, baseToneName, highlightUrls, delayMs) {
      if (!highlightUrls) {
        for (const ch of value) {
          process.stdout.write(tone(ch, baseToneName));
          if (ch !== " ") {
            // eslint-disable-next-line no-await-in-loop
            await animSleep(delayMs);
          }
        }
        return;
      }
      let bodyNonSpace = 0;
      for (const part of splitTextWithHttpUrls(value)) {
        const segTone = part.link ? "cyan" : baseToneName;
        for (const ch of part.text) {
          process.stdout.write(tone(ch, segTone));
          if (ch !== " ") {
            bodyNonSpace += 1;
            if (bodyNonSpace % BODY_VALUE_CHARS_PER_TICK === 0) {
              // eslint-disable-next-line no-await-in-loop
              await animSleep(delayMs);
            }
          }
        }
      }
    }

    /**
     * @param {string} label
     * @param {string} value
     * @param {"cyan" | "yellow" | "dim"} valueToneName
     * @param {boolean} [highlightUrls]
     */
    async function typeComposeFieldLine(label, value, valueToneName, highlightUrls = false) {
      const labelPadded = label.padEnd(L);
      if (highlightUrls) {
        const delayLabel = computeComposeCharDelay(labelPadded.length + 1, { bodyBoost: false });
        const delayValue = computeComposeCharDelay(value.length, { bodyBoost: true });
        for (const ch of labelPadded) {
          process.stdout.write(tone(ch, "dim"));
          if (ch !== " ") {
            // eslint-disable-next-line no-await-in-loop
            await animSleep(delayLabel);
          }
        }
        process.stdout.write(" ");
        await typeComposeValue(value, valueToneName, highlightUrls, delayValue);
      } else {
        const lineChars = labelPadded.length + 1 + value.length;
        const delayMs = computeComposeCharDelay(lineChars, { bodyBoost: false });
        for (const ch of labelPadded) {
          process.stdout.write(tone(ch, "dim"));
          if (ch !== " ") {
            // eslint-disable-next-line no-await-in-loop
            await animSleep(delayMs);
          }
        }
        process.stdout.write(" ");
        await typeComposeValue(value, valueToneName, highlightUrls, delayMs);
      }
      console.log("");
    }

    async function typeComposeTitleLine(text) {
      const delayMs = computeComposeCharDelay(text.length);
      for (const ch of text) {
        process.stdout.write(tone(ch, "bold"));
        if (ch !== " ") {
          // eslint-disable-next-line no-await-in-loop
          await animSleep(delayMs);
        }
      }
      console.log("");
    }

    // --- Clear & animate sending ---
    clearTerminalScreen("compose-outbound");

    const L = PHISHING_HEADER_LABEL_WIDTH;
    const targetRecipient = "m.chen@corp.orion.net";
    const draftPath = "/tmp/hktm/outbound-lure.eml";
    await typeComposeTitleLine("OUTBOUND LURE");
    console.log("");
    await typeComposeFieldLine("To:", targetRecipient, "cyan");
    await typeComposeFieldLine("From:", fromChoice.label, "cyan");
    await typeComposeFieldLine("Subject:", subjectChoice.label, "yellow");
    const bodyInner = Math.max(24, cw - 2 - L);
    const bodyRows = [];
    const bodyParagraphs = String(bodyChoice.label).split("\n");
    for (const para of bodyParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        bodyRows.push("");
        continue;
      }
      const wrapped = wrap(trimmed, bodyInner);
      for (const row of wrapped) bodyRows.push(row);
    }
    for (let i = 0; i < bodyRows.length; i++) {
      if (bodyRows[i] === "") {
        console.log("");
        // eslint-disable-next-line no-await-in-loop
        await animSleep(fast ? 2 : 17);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await typeComposeFieldLine(i === 0 ? "Body:" : "", bodyRows[i], "dim", true);
    }
    await typeComposeFieldLine("Draft:", draftPath, "dim");
    await animSleep(composeDraftPauseMs);

    // --- Send command staging + operator confirmation ---
    console.log("");
    const prompt = "operator@local:~$ ";
    process.stdout.write(tone(prompt, "dim"));
    const sendCmd = `sendmail -t -oi -f "${fromChoice.label}" -- "${targetRecipient}" < "${draftPath}"`;
    const sendmailDelayMs = computeComposeCharDelay(sendCmd.length);
    for (const ch of sendCmd) {
      process.stdout.write(tone(ch, "green"));
      if (ch !== " ") {
        // eslint-disable-next-line no-await-in-loop
        await animSleep(sendmailDelayMs);
      }
    }
    console.log("");
    await animSleep(d(120));
    await waitForEnterContinue("Press Enter to send.");
    clearTerminalScreen("smtp-handshake");

    // --- SMTP handshake ---
    console.log("");
    const smtp = [
      "220 orion-smtp.orion.internal ESMTP Postfix",
      "EHLO operator.local",
      "250-orion-smtp.orion.internal",
      "250 STARTTLS",
      `MAIL FROM:<${fromChoice.label}>`,
      "250 2.1.0 Ok",
      `RCPT TO:<${targetRecipient}>`,
      "250 2.1.5 Ok",
      "DATA",
      "354 End data with <CR><LF>.<CR><LF>",
      ".",
      "250 2.0.0 Ok: queued as A1B2C3D4",
      "221 2.0.0 Bye",
    ];
    for (const line of smtp) {
      console.log(tone(line, "dim"));
      // eslint-disable-next-line no-await-in-loop
      await animSleep(lineMs);
    }
    await animSleep(d(200));
    console.log(`${tone("✔", "green")} ${tone("Lure delivered.", "dim")}`);
    await animSleep(d(500));

    // --- Waiting for victim ---
    console.log("");
    await loading("Waiting for target interaction...", d(1200), { tickKind: "probe" });

    // --- Victim reaction sequence ---
    console.log("");
    console.log(tone("TARGET ACTIVITY", "bold"));
    console.log("");

    const reactions = [
      { label: "m.chen opens email", delay: d(600) },
      { label: `Subject: ${subjectChoice.label.slice(0, 60)}${subjectChoice.label.length > 60 ? "…" : ""}`, delay: d(400) },
      { label: "m.chen reads body", delay: d(700) },
      { label: "m.chen clicks embedded link", delay: d(500) },
    ];
    for (const r of reactions) {
      console.log(`  ${tone("▸", "cyan")} ${tone(r.label, "dim")}`);
      // eslint-disable-next-line no-await-in-loop
      await animSleep(r.delay);
    }

    // --- Spoofed form loads ---
    await animSleep(d(300));
    console.log("");
    console.log(`  ${tone("https://sso.orion-training.invalid/renew", "cyan")}`);
    console.log(tone("  Orion SSO · session refresh", "dim"));
    await animSleep(d(400));
    console.log(`  ${tone("▸", "cyan")} ${tone("Form loaded", "dim")}`);
    await animSleep(d(500));

    // --- Victim types credentials ---
    console.log("");
    process.stdout.write(tone("  Email     ", "dim"));
    const email = targetRecipient;
    for (const ch of email) {
      process.stdout.write(tone(ch, "yellow"));
      // eslint-disable-next-line no-await-in-loop
      await animSleep(charMs);
    }
    console.log("");
    await animSleep(d(300));

    const password = "Orion_Stg#9q";
    process.stdout.write(tone("  Password  ", "dim"));
    for (const ch of password) {
      process.stdout.write(tone("•", "yellow"));
      // eslint-disable-next-line no-await-in-loop
      await animSleep(charMs);
    }
    console.log("");
    await animSleep(d(200));

    console.log(`  ${tone("[ Sign in ]", "green")} ${tone("← submitted", "dim")}`);
    await animSleep(d(600));

    // --- Harvest ---
    console.log("");
    console.log(`${tone("[HARVEST]", "green")} Password captured: ${tone(password, "yellow")}`);
    const localSecretId = "secret-orion-mail-mchen";
    state.artifacts.add(localSecretId);
    console.log(
      `${tone("[LOCAL SECRETS]", "magenta")} Stored ${tone(localSecretId, "yellow")} for reuse in later steps (${tone("stash", "cyan")} to verify).`,
    );
    console.log("");
    if (mission.objective?.type === "phishing") {
      logScreenStep("mission-complete-m1");
      console.log(tone("\nMission complete. Credential delivered to handler.", "green"));
      console.log("");
    }
    webGhostChatTrigger("post_phish_next_mission", {});
    // Do not clearTerminalScreen here — it erases [HARVEST]/[LOCAL SECRETS] from view. Flush only.
    flushChatNotification();
    if (!isWebUi()) {
      console.log("");
    }
  }

  /**
   * Spear-phish outbound: user-facing entry is `mail` (SMTP log still shows sendmail).
   * @param {"sendmail" | "mail"} tool — `sendmail` hidden CLI alias; same behavior as `mail`.
   */
  async function runPhishingOutboundCommand(argRaw, tool) {
    if (mission.id !== "m1-ghost-proxy") {
      console.log(tone("No spear-phish outbound channel on this mission.", "dim"));
      return 0;
    }
    const raw = String(argRaw ?? "").trim();
    if (tool === "sendmail" && raw) {
      console.log(`Usage: ${tone("sendmail", "cyan")} — no arguments.`);
      return 0;
    }
    if (state.currentNode !== "local") {
      console.log(`Run ${tone("mail", "cyan")} from your operator rig (${tone("local", "blue")}).`);
      return 0;
    }
    if (state.phishingBeatDone) {
      console.log(tone("Outbound spear-phish lure already delivered.", "dim"));
      return 0;
    }
    if (isCiE2E()) {
      state.phishingBeatDone = true;
      console.log(tone("(CI e2e) — spear-phish beat auto-completed.", "dim"));
      return 0;
    }

    await runPhishingLureSequence();
    state.phishingBeatDone = true;

    if (mission.objective?.type === "phishing") {
      state.finished = true;
      state.result = "success";
    }
    return 0;
  }

  async function runSendmailCommand(argRaw) {
    return runPhishingOutboundCommand(argRaw, "sendmail");
  }

  async function runComposeMailCommand(argRaw) {
    return runPhishingOutboundCommand(argRaw, "mail");
  }

  /**
   * After harvest / objective success — not the active-mission brief (see `printBanner`).
   * @param {{ instant?: boolean }} [options]
   */
  async function printMissionSuccessBanner(options = {}) {
    const instant = options.instant === true;
    const cw = textWrapWidth();
    const prevUi = getUiOptions();
    if (instant) setUiOptions({ typing: false });
    try {
      console.log("");
      const blurb =
        mission.objective?.type === "phishing"
          ? "Objective achieved — staging spear-phish delivered."
          : "Mission objective complete.";
      const lines = [
        ...wrap(tone(blurb, "green"), cw),
        "",
        ...wrap(highlightCommandHints(t("mission_success_interaction_hint")), cw),
      ];
      await box(tone(mission.title, "bold"), lines, getUiOptions().width);
    } finally {
      if (instant) setUiOptions({ typing: prevUi.typing });
    }
  }

  /**
   * @param {{ instant?: boolean, scrollbackBrief?: boolean }} [options] — `instant`: skip typing animation.
   *   `scrollbackBrief`: after ShadowNet IM exit / kernel replay — boxed BRIEF/OBJECTIVE plus tiered next-step hints; omits trace budget and “Type help” (those stay on `clear`/full banner).
   */
  async function printBanner(options = {}) {
    const instant = options.instant === true;
    const scrollbackBrief = options.scrollbackBrief === true;
    if (state.finished && state.result === "success") {
      await printMissionSuccessBanner({ instant });
      return;
    }
    const story = mission.story ?? {};
    const cw = textWrapWidth();
    const handler = story.handler?.name ? `${story.handler.name}` : "Handler";
    const time = story.time ?? "02:13";
    const region = story.region ?? "unknown sector";
    const opLines =
      globalThis.__HKTM_PROFILE?.codename
        ? [
            ...wrap(
              `${tone("OPERATOR:", "magenta")} ${globalThis.__HKTM_PROFILE.codename}  ${tone(`(${globalThis.__HKTM_PROFILE.regionId})`, "dim")}`,
              cw,
            ),
            "",
          ]
        : [];
    const lines = [
      ...opLines,
      ...wrap(`${tone("HANDLER:", "magenta")} ${handler}`, cw),
      ...wrap(`${tone("TIME:", "magenta")} ${time}   ${tone("REGION:", "magenta")} ${region}`, cw),
      "",
      ...wrap(`${tone("BRIEF:", "magenta")} ${highlightCommandHints(mission.brief)}`, cw),
      ...wrap(`${tone("OBJECTIVE:", "magenta")} ${highlightCommandHints(mission.objective.summary)}`, cw),
    ];

    const m1Tier = getM1ToolTier();
    const m1Locked = shouldApplyM1ToolLock() && m1Tier !== null;

    function pushM1NextStepHints() {
      if (m1Locked && m1Tier === 0) {
        lines.push(
          "",
          ...wrap(
            `${tone("Hint:", "dim")} ${highlightCommandHints("Run mail on local to draft the lure (info phishing). Open ShadowNet IM (chat, /exit) for handler comms. Network tools unlock after you deliver the lure.")}`,
            cw,
          ),
        );
        return;
      }
      if (mission.id !== "m1-ghost-proxy") return;
      if (m1Locked && m1Tier === 2) {
        lines.push(
          "",
          ...wrap(
            `${tone("Hint:", "dim")} ${highlightCommandHints("Scan and probe from your rig, then connect and enum for exploit ids.")}`,
            cw,
          ),
        );
      } else if (!m1Locked || m1Tier === 1) {
        lines.push(
          "",
          ...wrap(
            `${tone("Hint:", "dim")} ${highlightCommandHints("Run mail on local to draft and send the spear-phishing lure. info phishing for the theory.")}`,
            cw,
          ),
        );
      }
    }

    if (scrollbackBrief || (m1Locked && m1Tier === 0)) {
      pushM1NextStepHints();
    } else {
      lines.push(
        ...wrap(`${tone("TRACE BUDGET:", "magenta")} ${String(mission.security.maxTrace)}`, cw),
        "",
        ...wrap(highlightCommandHints("Type help for commands."), cw),
      );
      pushM1NextStepHints();
    }
    const prevUi = getUiOptions();
    if (instant) setUiOptions({ typing: false });
    try {
      console.log("");
      await box(tone(mission.title, "bold"), lines, getUiOptions().width);
    } finally {
      if (instant) setUiOptions({ typing: prevUi.typing });
    }
  }

  function getAlarmLevel() {
    const max = mission.security.maxTrace;
    const ratio = max > 0 ? state.trace / max : 0;
    if (state.socAlert) {
      if (state.socAlert.severity === "high") {
        return { label: "SOC hold — high", code: 4 };
      }
      return { label: "SOC hold — medium", code: 3 };
    }
    if (ratio >= 0.85) return { label: "Critical trace load", code: 3 };
    if (ratio >= 0.6) return { label: "Elevated trace", code: 2 };
    if (ratio >= 0.35) return { label: "Guarded", code: 1 };
    return { label: "Nominal", code: 0 };
  }

  function alarmLevelTone(code) {
    if (code >= 4) return "red";
    if (code >= 3) return "red";
    if (code >= 2) return "yellow";
    if (code >= 1) return "dim";
    return "green";
  }

  function maybeAmandaSecurityHints() {
    if (state.finished) return;
    const max = mission.security.maxTrace;
    const ratio = max > 0 ? state.trace / max : 0;
    if (!state.ghostTriggers.amandaTraceCritical && ratio >= 0.75) {
      state.ghostTriggers.amandaTraceCritical = true;
      state.ghostTriggers.amandaTracePressure = true;
      state.ghostTriggers.amandaTraceGuarded = true;
      webGhostChatTrigger("amanda_trace_critical", {});
    } else if (!state.ghostTriggers.amandaTracePressure && ratio >= 0.5) {
      state.ghostTriggers.amandaTracePressure = true;
      state.ghostTriggers.amandaTraceGuarded = true;
      webGhostChatTrigger("amanda_trace_pressure", {});
    } else if (!state.ghostTriggers.amandaTraceGuarded && ratio >= 0.25) {
      state.ghostTriggers.amandaTraceGuarded = true;
      webGhostChatTrigger("amanda_trace_guarded", {});
    }
    if (state.socAlert && !state.ghostTriggers.amandaSocPersonal) {
      state.ghostTriggers.amandaSocPersonal = true;
      webGhostChatTrigger("amanda_soc_personal", {});
    }
  }

  function showStatus() {
    console.log(`\n${tone("Status", "bold")}`);
    console.log(`Node: ${tone(state.currentNode, "blue")}`);
    console.log(`Turns: ${state.turns}`);
    const al = getAlarmLevel();
    console.log(`Alarm level: ${tone(al.label, alarmLevelTone(al.code))}`);
    console.log(`Trace: ${meter(state.trace, mission.security.maxTrace)}`);
    console.log(`Owned: ${[...state.ownedNodes].join(", ")}`);
    console.log(`Exfil: ${state.exfiltrated.size}/${mission.objective.exfilFiles.length}`);
    if (state.socAlert) {
      console.log(
        `${tone("SOC Alert:", "red")} ${state.socAlert.severity} (${state.socAlert.turnsRemaining} turns to react)`,
      );
      if (!state.socAlert.__hktm_soundOnStatus) {
        state.socAlert.__hktm_soundOnStatus = true;
        webAlarmRise();
      }
    }
    maybeAmandaSecurityHints();
  }

  function showMap() {
    console.log(`\n${tone("Network Map", "bold")}`);
    for (const n of mission.nodes) {
      if (!state.discoveredNodes.has(n.id)) continue;
      const owned = state.ownedNodes.has(n.id) ? tone("owned", "green") : tone("unknown", "dim");
      const here = n.id === state.currentNode ? " <you>" : "";
      const edges = mission.edges
        .filter((e) => e[0] === n.id || e[1] === n.id)
        .map((e) => (e[0] === n.id ? e[1] : e[0]))
        .filter((id) => state.discoveredNodes.has(id));
      console.log(`- ${tone(n.id, "blue")} (${owned})${here} -> ${edges.join(", ") || "none"}`);
    }
  }

  async function help() {
    const tier = getM1ToolTier();
    if (shouldApplyM1ToolLock() && (tier === 0 || tier === 1)) {
      const lines = [
        tone("Commands", "bold"),
        `  ${tone("help", "cyan")}                 show commands`,
        `  ${tone("clear", "cyan")}                clear screen and reprint header/status`,
        `  ${tone("status", "cyan")}               show current status (alarm level + trace; security pings in ShadowNet IM on web)`,
        `  ${tone("mail", "cyan")}                 ${tone("mail list", "dim")} | ${tone("mail read <id>", "cyan")} | bare ${tone("mail", "cyan")} on ${tone("local", "blue")} — spear-phishing lure`,
        `  ${tone("compose mail", "cyan")}         draft lure (multi-step; from ${tone("local", "blue")})`,
        `  ${tone("chat", "cyan")}                 ShadowNet IM`,
        `  ${tone("/brief", "cyan")}               current mission brief`,
        `  ${tone("info <term>", "cyan")}           glossary: commands + concepts (try: info help)`,
        `  ${tone("test sound", "cyan")}            audition all UI sounds`,
        `  ${tone("quit", "cyan")}                 exit campaign`,
        "",
        tone(t(tier === 0 ? "m1_help_tier0_footer" : "m1_help_tier1_footer"), "dim"),
        "",
        tone(t("screen_help"), "dim"),
      ];
      await pagedPlainLines(lines, t("pager_help_line"), "help");
      return;
    }

    const lines = [
      tone("Commands", "bold"),
      `  ${tone("help", "cyan")}                 show commands`,
      `  ${tone("clear", "cyan")}                clear screen and reprint header/status`,
      `  ${tone("status", "cyan")}               show current status (alarm level + trace; security pings in ShadowNet IM on web)`,
      `  ${tone("map", "cyan")}                  show discovered network graph`,
      `  ${tone("scan", "cyan")}                 list adjacent hosts`,
      `  ${tone("probe <host>", "cyan")}         remote port sweep (open ports; no exploit ids)`,
      `  ${tone("mail", "cyan")}                 ${
        mission.id === "m1-ghost-proxy"
          ? `${tone("mail list", "dim")} | ${tone("mail read <id>", "cyan")} | bare ${tone("mail", "cyan")} on ${tone("local", "blue")} — spear-phishing lure`
          : `mission inbox (if deployed) | ${tone("mail read <id>", "cyan")}`
      }`,
      `  ${tone("chat", "cyan")}                 ShadowNet IM`,
      `  ${tone("/brief", "cyan")}               current mission brief`,
      `  ${tone("test sound", "cyan")}            audition all UI sounds`,
      `  ${tone("connect <node>", "cyan")}       move to discovered adjacent node`,
      `  ${tone("enum", "cyan")}                 on-host: map ports → exploit ids + vuln class`,
      `  ${tone("enum -f / --force", "cyan")}    re-scan (costs trace again; use if you need fresh output)`,
      `  ${tone("exploit <id>", "cyan")}         run exploit on current node`,
      `  ${tone("info <term>", "cyan")}           glossary: commands + concepts (try: info help)`,
      `  ${tone("sql", "cyan")}                    SQL lab: ${tone("sql demo", "dim")} | ${tone(`sql translate "text"`, "dim")}`,
      `  ${tone("stash", "cyan")}                list collected credential artifacts`,
      `  ${tone("ls", "cyan")}                   list files on current node (owned only)`,
      `  ${tone("cat <path>", "cyan")}           read file on current node`,
      `  ${tone("exfil <path>", "cyan")}         exfiltrate file to your rig`,
      `  ${tone("cover", "cyan")}                reduce trace`,
      `  ${tone("spoof", "cyan")}                suppress active SOC alert`,
      `  ${tone("laylow", "cyan")}               spend turn to wait and cool down`,
      `  ${tone("tutorial", "cyan")}             show next tutorial hint (if available)`,
      `  ${tone("submit", "cyan")}               submit objective if complete`,
      `  ${tone("quit", "cyan")}                 exit campaign`,
      "",
      tone(t("screen_help"), "dim"),
    ];
    await pagedPlainLines(lines, t("pager_help_line"), "help");
  }

  function showStash() {
    if (state.artifacts.size === 0) {
      console.log("No artifacts collected.");
      return;
    }
    console.log(`\n${tone("Artifact Stash", "bold")}`);
    for (const id of [...state.artifacts].sort()) {
      console.log(`- ${tone(id, "yellow")}`);
    }
  }

  async function showMailList() {
    const unread = state.mail.filter((m) => !m.read).length;
    console.log(`\n${tone("Mission mail", "bold")}  ${tone(`(${unread} unread)`, "dim")}`);
    for (const m of state.mail) {
      const tag = m.read ? tone("READ", "dim") : tone("NEW", "yellow");
      console.log(`${tag}  ${tone(m.id, "cyan")}  ${tone(`<${m.from}>`, "dim")}`);
      console.log(`     ${m.subject}`);
    }
    console.log("");
    console.log(tone("mail read <id> — open full message (pager if long)", "dim"));
  }

  async function readMailMessage(id) {
    const m = state.mail.find((x) => x.id === id);
    if (!m) {
      console.log(`No message ${tone(id, "yellow")}. Use ${tone("mail", "cyan")} to list ids.`);
      return;
    }
    m.read = true;
    const inner = textWrapWidth();
    const bodyLines = wrap(highlightCommandHints(m.body), inner);
    const lines = [`${tone("From:", "dim")} ${m.from}`, "", ...bodyLines];
    await boxPaged(
      tone(`MAIL — ${m.subject}`, "bold"),
      lines,
      getUiOptions().width,
      t("pager_help_line"),
      `mail-read-${m.id}`,
    );
  }

  /** Simulated mapping: wargame input → ssh / psql strings (education only; no DB runs). */
  function runSqlSimulator(raw) {
    const arg = String(raw ?? "").trim();
    if (!arg) {
      console.log(tone("SQL mapping lab (compare naive concat vs bind)", "bold"));
      console.log(`  ${tone("sql demo", "cyan")}                — OR 1=1 style login bypass`);
      console.log(`  ${tone(`sql translate "…"`, "cyan")}  — your text → transport + naive psql line`);
      console.log(highlightCommandHints("Intel: cat /opt/intel/sql-bridge-note.txt on app-api (when owned)."));
      return 0;
    }
    const lower = arg.toLowerCase();
    if (lower === "demo") {
      console.log(tone("— App trusts user search string inside SQL (anti-pattern)", "magenta"));
      console.log(`  attacker input:  ' OR '1'='1`);
      console.log(tone("— Naive server builds (string concat):", "red"));
      console.log(`  SELECT * FROM users WHERE username = '' OR '1'='1' LIMIT 1;`);
      console.log(tone("— Safe pattern (parameter / prepared — input is data only):", "green"));
      console.log(`  SELECT * FROM users WHERE username = $1   -- bind: literal "' OR '1'='1"`);
      return 0;
    }
    const m = arg.match(/^translate\s+(.+)$/is);
    if (m) {
      let inner = m[1].trim();
      if (
        (inner.startsWith('"') && inner.endsWith('"')) ||
        (inner.startsWith("'") && inner.endsWith("'"))
      ) {
        inner = inner.slice(1, -1);
      }
      const host = state.currentNode;
      console.log(tone("— Layer 1: op context (wargame)", "magenta"));
      console.log(`  current node: ${tone(host, "blue")} (after connect)`);
      console.log(tone("— Layer 2: transport (would run)", "magenta"));
      console.log(`  ssh -o StrictHostKeyChecking=accept-new ops@${host}`);
      console.log(tone("— Layer 3: naive psql one-liner (vulnerable concat)", "red"));
      console.log(
        `  psql -h /var/run/postgresql -U svc_app -d reports -c "SELECT id,note FROM tickets WHERE title='${inner}';"`,
      );
      console.log(tone("— Example injected clause in same slot:", "yellow"));
      console.log(`  ${tone("' UNION SELECT NULL,version()--", "cyan")}`);
      console.log(tone("— Safer: parameters / bind (illustrative)", "green"));
      console.log(
        `  psql ... -c 'SELECT id,note FROM tickets WHERE title = $1' -- with bound value (not pasted into SQL text)`,
      );
      return 0;
    }
    console.log(highlightCommandHints('Try: sql demo   or   sql translate "your text"'));
    return 0;
  }

  async function clearScreen() {
    if (process.stdout.isTTY) {
      clearTerminalScreen("mission-clear");
    } else {
      console.log("\n".repeat(20));
      logScreenStep("mission-clear");
    }
    await printBanner();
  }

  function printKnownInfoTerms() {
    let keys = Object.keys(INFO_GLOSSARY).sort();
    const tier = getM1ToolTier();
    if (shouldApplyM1ToolLock() && tier === 0) {
      const allow = new Set(["chat", "help", "info", "mail", "phishing"]);
      keys = keys.filter((k) => allow.has(k));
    }
    const cw = textWrapWidth();
    console.log(tone("Known terms:", "dim"));
    for (const line of wrap(highlightCommandHints(keys.join(", ")), cw)) {
      console.log(line);
    }
  }

  async function restoreShellAfterInfoPause() {
    const runDefaultRestore = async () => {
      const shellScene =
        state.finished && state.result === "success" ? "mission-success-shell" : "post-splash";
      if (process.stdout.isTTY) {
        clearTerminalScreen(shellScene, "clear");
      } else {
        console.log("\n".repeat(20));
        logScreenStep(shellScene);
      }
      await printBanner({ instant: true });
      showStatus();
    };

    if (typeof afterInfoRestore === "function") {
      await afterInfoRestore(runDefaultRestore);
      return;
    }
    await runDefaultRestore();
  }

  async function finalizeInfoAfterContent(stepSlug) {
    logInfoPauseStep(stepSlug);
    await waitForEnterContinue(t("press_enter_continue"));
    await restoreShellAfterInfoPause();
  }

  async function info(termRaw) {
    const term = String(termRaw ?? "").trim().toLowerCase();
    const tier = getM1ToolTier();
    if (shouldApplyM1ToolLock() && tier === 0 && term) {
      const allow = new Set(["chat", "help", "info", "mail", "phishing"]);
      if (!allow.has(term)) {
        clearTerminalScreen("info-usage", "info");
        console.log(tone(t("m1_info_locked_tier0"), "yellow"));
        printKnownInfoTerms();
        await finalizeInfoAfterContent("info-locked-t0");
        return;
      }
    }
    if (!term) {
      clearTerminalScreen("info-usage", "info");
      console.log(`${tone("Usage:", "dim")} ${highlightCommandHints("info <term>. Example: info probe")}`);
      printKnownInfoTerms();
      await finalizeInfoAfterContent("info-usage");
      return;
    }

    const entry = INFO_GLOSSARY[term] ?? null;
    if (!entry) {
      clearTerminalScreen("info-unknown", "info");
      console.log("Unknown term.");
      printKnownInfoTerms();
      await finalizeInfoAfterContent("info-unknown");
      return;
    }

    const cw = textWrapWidth();
    const bodyLines = [...wrap(highlightCommandHints(entry.about), cw)];
    if (entry.exploit) {
      bodyLines.push("", ...wrap(highlightCommandHints(entry.exploit), cw));
    }
    await boxPaged(
      tone(`INFO: ${term}`, "bold"),
      bodyLines,
      getUiOptions().width,
      t("pager_help_line"),
      `info-${term}`,
      { stepDebugKind: "info" },
    );
    await finalizeInfoAfterContent(`info-${term}`);
  }

  function checkFail() {
    if (state.finished) return false;
    if (state.trace >= mission.security.maxTrace) {
      console.log(tone("\n[ALERT] Trace threshold reached. Session burned.", "red"));
      state.finished = true;
      state.result = "failed";
      return true;
    }
    return false;
  }

  function listAdjacentHosts() {
    /** Owning only `local` while `connect`ed to `gw-edge` is common — expand edges from current position too, not just owned nodes. */
    const seeds = new Set([...state.ownedNodes, state.currentNode]);
    const neighbors = new Set();
    for (const seed of seeds) {
      for (const [a, b] of mission.edges) {
        if (a === seed) neighbors.add(b);
        if (b === seed) neighbors.add(a);
      }
    }

    const undiscovered = [...neighbors].filter((id) => !state.discoveredNodes.has(id)).sort();
    const discovered = [...neighbors].filter((id) => state.discoveredNodes.has(id)).sort();

    if (neighbors.size === 0) {
      console.log("No graph neighbors found from your footholds and current node.");
      return 0;
    }

    if (undiscovered.length > 0) {
      /* No leading newline: follows loading() “✔ …” line like probe — avoids a blank line after the spinner. */
      console.log(`${tone("Adjacent hosts (not fingerprinted yet — run port sweep)", "bold")}`);
      for (const id of undiscovered) {
        console.log(
          `- ${tone(id, "blue")}  (${tone("port sweep:", "dim")} ${tone(`probe ${id}`, "cyan")})`,
        );
      }
      if (!state.ghostTriggers.edgeListed && undiscovered.includes("gw-edge")) {
        state.ghostTriggers.edgeListed = true;
        webGhostChatTrigger("edge_listed", {});
      }
    }

    if (discovered.length > 0) {
      const gapBeforeDiscovered = undiscovered.length > 0 ? "\n" : "";
      console.log(`${gapBeforeDiscovered}${tone("Adjacent hosts (already discovered)", "bold")}`);
      for (const id of discovered) {
        console.log(
          `- ${tone(id, "blue")}  (${tone("next:", "dim")} ${tone(`connect ${id}`, "cyan")} ${tone("from a node that shares an edge; then", "dim")} ${tone("enum", "cyan")})`,
        );
      }
    }

    if (undiscovered.length === 0) {
      console.log(
        tone(
          "\nNo new hosts to probe on direct edges from your footholds / current node — listed hosts are already fingerprinted.",
          "dim",
        ),
      );
    }

    return 0;
  }

  function probeTarget(target) {
    if (!nodeById.has(target)) {
      console.log("Unknown node id.");
      return 0;
    }
    const canReach = probeReachable(mission, state.ownedNodes, state.discoveredNodes, target);
    if (!canReach) {
      console.log("Target not adjacent to your foothold.");
      addTrace(2);
      return 2;
    }
    state.discoveredNodes.add(target);
    if (target === "gw-edge" && !state.ghostTriggers.probeGw) {
      state.ghostTriggers.probeGw = true;
      webGhostChatTrigger("probe_gw", {});
      webGhostChatTrigger("amanda_reunion", {});
      webGhostChatTrigger("amanda_lead_thanks", {});
      webGhostChatTrigger("amanda_lead_denial", {});
    }
    addTrace(1);
    console.log(`${tone("Probe complete:", "green")} ${target} fingerprinted (routing + port sweep).`);
    printPortSweep(target, node(target));

    if (state.currentNode === target) {
      return 1;
    }

    if (isConnected(mission, state.currentNode, target)) {
      const hop = connectHopBlocked(state.currentNode, target);
      if (hop.blocked && hop.gate?.afterExploit) {
        const g = hop.gate.afterExploit;
        console.log(
          `${tone("Edge exists, but connect is gated:", "yellow")} run ${tone(`exploit ${g.exploitId}`, "cyan")} on ${tone(g.node, "blue")} first — then ${tone(`connect ${target}`, "cyan")}.`,
        );
      } else {
        console.log(`${tone("Route available:", "green")} connect ${tone(target, "blue")}`);
      }
      return 1;
    }

    const via = [...state.ownedNodes].find((owned) => isConnected(mission, owned, target));
    if (via) {
      const hop = connectHopBlocked(via, target);
      if (hop.blocked && hop.gate?.afterExploit) {
        const g = hop.gate.afterExploit;
        console.log(
          `${tone("Foothold can reach this host, but that hop is gated:", "yellow")} complete ${tone(`exploit ${g.exploitId}`, "cyan")} on ${tone(g.node, "blue")} — then ${tone(`connect ${via}`, "cyan")} → ${tone(`connect ${target}`, "cyan")}.`,
        );
      } else {
        console.log(
          `${tone("Reachable via foothold:", "yellow")} connect ${tone(via, "blue")} -> connect ${tone(target, "blue")}`,
        );
      }
    }
    return 1;
  }

  async function runConnect(arg) {
    const target = String(arg ?? "").trim();
    if (!target || !nodeById.has(target)) {
      console.log("Unknown node id.");
      return 0;
    }
    if (!state.discoveredNodes.has(target)) {
      console.log("Target is not discovered yet.");
      return 0;
    }
    if (!isConnected(mission, state.currentNode, target) && state.currentNode !== target) {
      console.log("No direct route from current node.");
      return 0;
    }
    if (state.currentNode === target) {
      console.log(`${tone("Connected to", "green")} ${tone(target, "blue")}`);
      return 0;
    }
    const gates = mission.connectGates ?? [];
    const gate = gates.find((g) => g.from === state.currentNode && g.to === target);
    if (gate?.afterExploit) {
      const { node: gateNode, exploitId: gateExploit } = gate.afterExploit;
      const key = `${gateNode}:${gateExploit}`;
      if (!state.exploitGatesMet.has(key)) {
        console.log(
          `${tone("Link blocked.", "yellow")} Complete ${tone(`exploit ${gateExploit}`, "cyan")} on ${tone(gateNode, "blue")} first — the gateway will not accept your session until staging credentials exist.`,
        );
        return 0;
      }
    }
    const fromId = state.currentNode;
    await connectRouteAnimation(fromId, target);
    state.currentNode = target;
    if (target === "gw-edge" && !state.ghostTriggers.onGw) {
      state.ghostTriggers.onGw = true;
      webGhostChatTrigger("connect_gw", {});
    }
    console.log(`${tone("Connected to", "green")} ${tone(target, "blue")}`);
    return 0;
  }

  function parseEnumArgs(argRaw) {
    const parts = String(argRaw ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    let force = false;
    for (const p of parts) {
      const low = p.toLowerCase();
      if (low === "-f" || low === "--force") {
        force = true;
      } else {
        return { force: false, invalid: true, unknown: p };
      }
    }
    return { force, invalid: false };
  }

  function printEnumServices(n) {
    console.log(
      `\n${tone(`On-host enumeration @ ${n.id}`, "bold")}  (${tone("session on this node — not a remote probe", "dim")})`,
    );
    console.log(
      tone(
        "Maps listeners to exploit ids and weakness classes. Use exploit <id> here; some paths need artifacts (cat/stash) or intel chains (e.g. SQL notes → DB credentials elsewhere).",
        "dim",
      ),
    );
    console.log(
      `${tone("PROTO", "dim")} ${tone("PORT", "dim")}  ${tone("SERVICE", "dim")}     ${tone("KNOWN WEAKNESS / CVE CLASS", "dim")}`,
    );
    for (const s of n.services) {
      const proto = serviceProtocol(s);
      const vuln = s.vulnRef ?? s.vulnerability ?? "(author mission JSON)";
      console.log(
        `${proto.padEnd(5)} ${String(s.port).padEnd(5)}  ${String(s.name ?? "?").padEnd(12)} ${vuln}`,
      );
      console.log(
        `      → ${tone("exploit", "cyan")} ${tone(s.exploitId, "yellow")}   ${tone("info", "dim")} ${s.exploitId}`,
      );
    }
  }

  function enumerate(argRaw) {
    const parsed = parseEnumArgs(argRaw);
    if (parsed.invalid) {
      console.log(
        `enum: unknown argument ${tone(parsed.unknown, "yellow")}. Use ${tone("enum -f", "cyan")} or ${tone("enum --force", "cyan")} to re-scan.`,
      );
      return 0;
    }

    const n = node(state.currentNode);
    const key = `${state.currentNode}:enum`;
    const cached = state.enumerated.has(key);

    if (cached && !parsed.force) {
      console.log(
        tone("(cached enum — same services; use enum -f or enum --force to re-scan with trace cost)", "dim"),
      );
      printEnumServices(n);
      return 0;
    }

    if (!cached) {
      state.enumerated.add(key);
    }

    const risk = n.noise.enum ?? 2;
    addTrace(risk);

    if (cached && parsed.force) {
      console.log(tone("(forced re-enumeration — additional trace applied)", "dim"));
    }

    printEnumServices(n);
    return risk;
  }

  function exploit(exploitId) {
    const n = node(state.currentNode);
    const service = n.services.find((s) => s.exploitId === exploitId);
    if (!service) {
      console.log("Exploit id not valid for this node.");
      addTrace(2);
      return 2;
    }
    const gateKey = `${n.id}:${exploitId}`;
    if (state.ownedNodes.has(n.id)) {
      const staging = Boolean(service.stagingOnly);
      if (!staging) {
        console.log("Node already compromised.");
        return 0;
      }
      if (state.exploitGatesMet.has(gateKey)) {
        console.log("That staging step is already complete.");
        return 0;
      }
    }

    if (Array.isArray(service.requiresArtifacts) && service.requiresArtifacts.length > 0) {
      const missing = service.requiresArtifacts.filter((id) => !state.artifacts.has(id));
      if (missing.length > 0) {
        console.log(
          `${tone("Exploit blocked.", "red")} Missing required artifact(s): ${missing.map((x) => tone(x, "yellow")).join(", ")}`,
        );
        console.log(
          `${tone("Tip:", "dim")} ${highlightCommandHints("search for credential artifacts via cat on intel files, then check stash.")}`,
        );
        addTrace(1);
        return 1;
      }
    }

    if (
      mission.id === "m1-ghost-proxy" &&
      n.id === "local" &&
      exploitId === "weak-ssh" &&
      !state.phishingBeatDone
    ) {
      console.log(
        `${tone("Exploit blocked.", "yellow")} ${highlightCommandHints("Complete the spear-phish step first: mail on local — deliver the lure and harvest the password.")}`,
      );
      return 0;
    }

    const risk = service.noise ?? 4;
    addTrace(risk);
    state.exploitGatesMet.add(gateKey);
    if (!state.ownedNodes.has(n.id)) {
      state.ownedNodes.add(n.id);
    }
    const ref = (service.vulnRef ?? service.vulnerability ?? "").slice(0, 64);
    const refBit = ref ? ` ${tone(`— ${ref}`, "dim")}` : "";
    const staging = Boolean(service.stagingOnly);
    const outcome = staging
      ? `${tone("Exploit succeeded.", "green")} Staging ${service.name}:${service.port}/${serviceProtocol(service)} on ${n.id} — gateway hop authorized.${refBit}`
      : `${tone("Exploit succeeded.", "green")} ${service.name}:${service.port}/${serviceProtocol(service)} on ${n.id} (owned).${refBit}`;
    console.log(outcome);
    if (exploitId === "misconfig-copy") {
      console.log(
        tone(
          "[sim] psql banner: COPY FROM STDIN available — training scenario only; no PROGRAM / no host access.",
          "dim",
        ),
      );
      const need = mission.objective?.exfilFiles ?? [];
      if (need.length > 0) {
        const first = need[0];
        console.log(
          `${tone("Next step:", "yellow")} ${tone(`exfil ${first}`, "cyan")} ${tone("(pull evidence to your rig), then", "dim")} ${tone("submit", "cyan")} ${tone("to finish the objective.", "dim")}`,
        );
      }
    }
    notifyBell();
    return risk;
  }

  function listFiles() {
    const n = node(state.currentNode);
    if (!state.ownedNodes.has(n.id)) {
      console.log("Access denied. Compromise node first.");
      return 0;
    }
    console.log(`\n${tone(`Files @ ${n.id}`, "bold")}`);
    for (const f of n.files) console.log(`- ${f.path}`);
    return 0;
  }

  async function readFile(filePath) {
    const n = node(state.currentNode);
    if (!state.ownedNodes.has(n.id)) {
      console.log("Access denied. Compromise node first.");
      return 0;
    }
    const f = n.files.find((x) => x.path === filePath);
    if (!f) {
      console.log("File not found.");
      return 0;
    }
    addTrace(1);
    console.log(`\n${tone(filePath, "yellow")}`);
    console.log(f.content);

    if (f.artifact?.id && typeof f.artifact.id === "string") {
      const id = f.artifact.id;
      if (!state.artifacts.has(id)) {
        state.artifacts.add(id);
        const desc = typeof f.artifact.description === "string" ? f.artifact.description : "credential artifact acquired";
        await boxPaged(
          tone("ARTIFACT ACQUIRED", "bold"),
          wrap(`${id}: ${desc}`, textWrapWidth()),
          getUiOptions().width,
          t("pager_help_line"),
          "artifact-acquired",
        );
      }
    }
    return 1;
  }

  function exfil(filePath) {
    const n = node(state.currentNode);
    if (!state.ownedNodes.has(n.id)) {
      console.log("Access denied. Compromise node first.");
      return 0;
    }
    const f = n.files.find((x) => x.path === filePath);
    if (!f) {
      console.log("File not found.");
      return 0;
    }
    state.exfiltrated.add(filePath);
    addTrace(3);
    console.log(`${tone("Exfil success:", "green")} ${filePath}`);
    return 3;
  }

  function cover() {
    state.trace = Math.max(0, state.trace - 4);
    console.log(`${tone("Noise reduced.", "green")} Trace lowered by cleanup routine.`);
    webAlarmReduce();
    return 0;
  }

  function spoof() {
    if (!state.socAlert) {
      console.log("No active SOC alert to spoof.");
      return 0;
    }
    const resolved = state.socAlert;
    state.socAlert = null;
    const traceDrop = resolved.severity === "high" ? 2 : 1;
    state.trace = Math.max(0, state.trace - traceDrop);
    console.log(`${tone("Spoof successful.", "green")} SOC alert suppressed.`);
    webAlarmReduce();
    return 0;
  }

  function laylow() {
    const drop = state.socAlert ? 1 : 2;
    state.trace = Math.max(0, state.trace - drop);
    if (state.socAlert) {
      state.socAlert.turnsRemaining = Math.max(1, state.socAlert.turnsRemaining - 1);
    }
    console.log(`${tone("Staying dark...", "dim")} Trace reduced by ${drop}.`);
    webAlarmReduce();
    return 0;
  }

  async function submit() {
    const objectiveFiles = mission.objective.exfilFiles;
    const missing = objectiveFiles.filter((f) => !state.exfiltrated.has(f));
    if (missing.length > 0) {
      console.log(`Objective incomplete. Missing exfil: ${missing.join(", ")}`);
      return 0;
    }
    if (!state.ownedNodes.has(mission.objective.requiredNode)) {
      console.log(`Objective incomplete. You must own ${mission.objective.requiredNode}.`);
      return 0;
    }
    console.log(tone("\nMission complete. Payload delivered to handler.", "green"));
    if (mission.story?.debrief?.success) {
      await boxPaged(
        tone("DEBRIEF", "bold"),
        wrap(mission.story.debrief.success, textWrapWidth()),
        getUiOptions().width,
        t("pager_help_line"),
        "debrief-success",
      );
      state.finished = true;
      state.result = "success";
      return 0;
    }
    state.finished = true;
    state.result = "success";
    return 0;
  }

  function printMissionBriefSlash() {
    const lines = getMissionBriefChatMessages(mission, { missionIndex, missionTotal });
    const w = textWrapWidth();
    console.log("");
    for (const line of lines) {
      for (const row of wrap(line, w)) {
        console.log(`${tone("[brief]", "cyan")} ${tone(row, "yellow")}`);
      }
    }
    console.log("");
    console.log(`${tone("Tip:", "dim")} ${t("brief_slash_hint_chat").replace(/\/brief/g, tone("/brief", "cyan"))}`);
    console.log("");
  }

  async function execute(inputLine) {
    const line = inputLine.trim();
    if (!line) return;
    resetAnimTurbo();
    try {
      await executeImpl(line);
    } finally {
      resetAnimTurbo();
    }
  }

  async function executeImpl(line) {
    const [command, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    const c = command.toLowerCase();

    if (state.finished) {
      if (state.result !== "success") {
        console.log("Mission already resolved. Use retry or quit.");
        return;
      }
      const argLower = arg.trim().toLowerCase();
      const allowChat = c === "chat";
      const allowInfoChat = c === "info" && (argLower === "chat" || argLower.startsWith("chat "));
      if (!allowChat && !allowInfoChat) {
        console.log(tone(highlightCommandHints(t("mission_success_interaction_hint")), "dim"));
        return;
      }
    }

    const m1TierGate = getM1ToolTier();
    if (shouldApplyM1ToolLock() && m1TierGate !== null && m1TierGate !== 2 && !isM1CommandUnlocked(c, arg)) {
      /* Tier 0/1: mail/compose are allowed; remaining locks are network tools until phishing beat. */
      console.log(tone(t("m1_tool_lock_tier1"), "yellow"));
      return;
    }

    state.lastCommand = c;
    state.lastArg = arg;

    state.turns += 1;
    let risk = 0;
    /** Unknown verb: show error only — do not reprint the status block. */
    let skipStatusAfter = false;

    switch (c) {
      case "help":
        await help();
        break;
      case "clear":
        await clearScreen();
        break;
      case "/brief":
        printMissionBriefSlash();
        risk = 0;
        break;
      case "status":
        break;
      case "map":
        showMap();
        break;
      case "scan": {
        const raw = String(arg ?? "").trim();
        const lower = raw.toLowerCase();
        if (lower.startsWith("ports ")) {
          const host = raw.slice(6).trim();
          if (host) {
            console.log(
              `${tone("Use ", "dim")}${tone(`probe ${host}`, "cyan")} ${tone("(remote port sweep — enum after connect for exploit ids)", "dim")}`,
            );
          } else {
            console.log(`Usage: ${tone("probe <host>", "cyan")} — remote port sweep (no exploit ids).`);
          }
          risk = 0;
          break;
        }
        if (raw) {
          console.log(
            `${tone("Usage:", "dim")} ${tone("scan", "cyan")} — list adjacent hosts. ${tone("probe <host>", "cyan")} — remote port sweep.`,
          );
          risk = 0;
          break;
        }
        await scanNetworkAnimation(state.currentNode);
        risk = listAdjacentHosts();
        break;
      }
      case "probe": {
        const host = String(arg ?? "").trim();
        if (!host) {
          console.log(`Usage: ${tone("probe <host>", "cyan")} — remote port sweep (enum after connect for exploit ids).`);
          risk = 0;
          break;
        }
        await loading(`Port sweep ${host}...`, 220, { tickKind: "probe" });
        try {
          if (isWebUi()) globalThis.__HKTM_RENDER_SOUND_KIND = "probe";
          risk = probeTarget(host);
        } finally {
          if (isWebUi()) delete globalThis.__HKTM_RENDER_SOUND_KIND;
        }
        break;
      }
      case "connect":
        risk = await runConnect(arg);
        break;
      case "enum": {
        const parsedEnum = parseEnumArgs(arg);
        const keyEnum = `${state.currentNode}:enum`;
        const cachedEnum = state.enumerated.has(keyEnum);
        const runEnumAnim =
          !parsedEnum.invalid && (!cachedEnum || parsedEnum.force);
        if (runEnumAnim) {
          await loading(`Enumerating services on ${state.currentNode}...`, 320, { tickKind: "enum" });
        }
        try {
          if (isWebUi()) globalThis.__HKTM_RENDER_SOUND_KIND = "enum";
          risk = enumerate(arg);
        } finally {
          if (isWebUi()) delete globalThis.__HKTM_RENDER_SOUND_KIND;
        }
        break;
      }
      case "exploit":
        await loading(`Deploying exploit ${arg}...`, 520, { tickKind: "exploit" });
        try {
          if (isWebUi()) globalThis.__HKTM_RENDER_SOUND_KIND = "exploit";
          risk = exploit(arg);
        } finally {
          if (isWebUi()) delete globalThis.__HKTM_RENDER_SOUND_KIND;
        }
        break;
      case "sendmail":
        risk = await runSendmailCommand(arg);
        break;
      case "compose": {
        const composeArg = String(arg ?? "").trim().toLowerCase();
        if (composeArg === "mail" || composeArg.startsWith("mail ")) {
          risk = await runPhishingOutboundCommand("", "mail");
        } else {
          console.log(`Usage: ${tone("mail", "cyan")} — draft and send a spear-phishing lure from your rig.`);
        }
        break;
      }
      case "info":
        await info(arg);
        skipStatusAfter = true;
        break;
      case "chat": {
        const chatArg = String(arg ?? "").trim().toLowerCase();
        if (chatArg === "close" || chatArg === "hide" || chatArg === "exit" || chatArg === "/exit") {
          if (isWebUi()) globalThis.__HKTM_GHOST_CHAT_CLOSE?.();
          else {
            console.log(
              tone("(Terminal: ShadowNet IM is shown with `chat` in this window — no separate UI to close.)", "dim"),
            );
          }
        } else {
          await showContactChatSession();
        }
        risk = 0;
        break;
      }
      case "mail": {
        const mailArg = String(arg ?? "").trim();
        const ml = mailArg.toLowerCase();
        if (mission.id === "m1-ghost-proxy" && !state.phishingBeatDone) {
          if (ml.startsWith("read ")) {
            const mid = mailArg.slice(5).trim();
            if (!mid) {
              console.log(`Usage: ${tone("mail read <id>", "cyan")}`);
              risk = 0;
              break;
            }
            if (!state.mail.length) {
              console.log(tone("No mission mail channel on this deployment.", "dim"));
              risk = 0;
              break;
            }
            await readMailMessage(mid);
            risk = 0;
            break;
          }
          if (ml === "list" || ml === "inbox") {
            if (!state.mail.length) {
              console.log(tone("No mission mail channel on this deployment.", "dim"));
              risk = 0;
              break;
            }
            await showMailList();
            risk = 0;
            break;
          }
          if (!mailArg) {
            risk = await runPhishingOutboundCommand("", "mail");
            break;
          }
          console.log(
            `Usage: ${tone("mail", "cyan")} — spear-phishing lure  |  ${tone("mail list", "cyan")}  |  ${tone("mail read <id>", "cyan")}`,
          );
          risk = 0;
          break;
        }
        if (!state.mail.length) {
          console.log(tone("No mission mail channel on this deployment.", "dim"));
          risk = 0;
          break;
        }
        if (!mailArg || ml === "list") {
          await showMailList();
          risk = 0;
          break;
        }
        if (ml.startsWith("read ")) {
          const mid = mailArg.slice(5).trim();
          if (!mid) {
            console.log(`Usage: ${tone("mail read <id>", "cyan")}`);
            risk = 0;
            break;
          }
          await readMailMessage(mid);
          risk = 0;
          break;
        }
        console.log(
          `Usage: ${tone("mail", "cyan")}  — list threads | ${tone("mail read <id>", "cyan")} — open in pager`,
        );
        risk = 0;
        break;
      }
      case "sql":
        await loading("Resolving SQL bridge (mapping)...", 180);
        risk = runSqlSimulator(arg);
        break;
      case "stash":
        showStash();
        break;
      case "ls":
        risk = listFiles();
        break;
      case "cat":
        await loading("Reading file...", 120);
        risk = await readFile(arg);
        break;
      case "exfil":
        await loading("Staging exfil bundle...", 360);
        risk = exfil(arg);
        break;
      case "cover":
        await loading("Scrubbing artifacts...", 260);
        risk = cover();
        break;
      case "spoof":
        await loading("Injecting spoofed telemetry...", 260);
        risk = spoof();
        break;
      case "laylow":
        await loading("Holding pattern (radio silence)...", 420);
        risk = laylow();
        break;
      case "submit":
        await loading("Finalizing drop & submitting...", 520);
        risk = await submit();
        break;
      case "tutorial":
        await showTutorialHint();
        break;
      case "test": {
        const sub = String(arg ?? "").trim().toLowerCase();
        if (sub !== "sound") {
          console.log(`${tone("Usage:", "dim")} ${tone("test sound", "cyan")} — animate each sound event name, then play it.`);
          risk = 0;
          skipStatusAfter = true;
          break;
        }
        if (typeof globalThis.__HKTM_SOUND_SELF_TEST === "function") {
          await globalThis.__HKTM_SOUND_SELF_TEST();
        } else {
          await runSoundSelfTestNode();
        }
        risk = 0;
        skipStatusAfter = true;
        break;
      }
      case "quit":
        state.finished = true;
        state.result = "aborted";
        console.log("Campaign session closed.");
        break;
      default:
        console.log(`Unknown command: ${command}`);
        skipStatusAfter = true;
        break;
    }

    const cmd = command.toLowerCase();
    if (cmd === "quit") {
      return;
    }

    if (!state.finished) {
      maybeTriggerSoc(cmd, risk);
      progressSocAlert();
      checkFail();
    }

    if (!skipStatusAfter && !(state.finished && state.result === "success")) {
      showStatus();
    }

    if (state.finished && state.result === "failed" && mission.story?.debrief?.fail) {
      await boxPaged(
        tone("DEBRIEF", "bold"),
        wrap(mission.story.debrief.fail, textWrapWidth()),
        getUiOptions().width,
        t("pager_help_line"),
        "debrief-fail",
      );
    }

    flushChatNotification();
  }

  /**
   * Guided hints from `mission.tutorial.steps` (mission JSON). Shipped missions may use an empty
   * `steps` array while content is reworked; matching logic stays for future steps. Each step uses
   * `when` plus optional `nodeId`, `gate`, `path`, `title`, `text`, `suggest`.
   */
  async function showTutorialHint() {
    if (!mission.tutorial?.steps?.length) {
      return;
    }

    const steps = mission.tutorial.steps;
    const completed = new Set(state.exfiltrated);
    const discovered = state.discoveredNodes;
    const owned = state.ownedNodes;
    const enumeratedHere = state.enumerated.has(`${state.currentNode}:enum`);

    const next = steps.find((s) => {
      switch (s.when) {
        case "discover_gw":
          return !discovered.has(s.nodeId);
        case "enum_here":
          return !enumeratedHere;
        case "enum_on_node":
          return !state.enumerated.has(`${s.nodeId}:enum`);
        case "phishing_pending":
          return mission.id === "m1-ghost-proxy" && !state.phishingBeatDone;
        case "gate_met":
          return !state.exploitGatesMet.has(`${s.gate.node}:${s.gate.exploitId}`);
        case "not_on_node":
          return state.currentNode !== s.nodeId;
        case "own_node":
          return !owned.has(s.nodeId);
        case "exfil":
          return !completed.has(s.path);
        case "submit":
          return state.result === "in_progress";
        default:
          return true;
      }
    });

    if (!next) {
      console.log(tone("Tutorial complete. You're on your own now.", "green"));
      return;
    }

    const lines = [];
    if (next.title) lines.push(tone(next.title, "bold"));
    if (next.text) lines.push(...wrap(highlightCommandHints(next.text), textWrapWidth()));
    const dynamicSuggest = (() => {
      if (next.when === "not_on_node" && next.nodeId) {
        return `connect ${next.nodeId}`;
      }
      if (next.when !== "own_node" || !next.nodeId) return null;

      const targetNode = next.nodeId;
      if (state.currentNode !== targetNode) {
        return `connect ${targetNode}`;
      }

      const enumKey = `${targetNode}:enum`;
      if (!state.enumerated.has(enumKey)) {
        return "enum";
      }

      const svc = node(targetNode)?.services?.[0];
      if (svc?.exploitId) {
        return `exploit ${svc.exploitId}`;
      }

      return null;
    })();

    const suggest = dynamicSuggest ?? next.suggest ?? null;
    if (next.when === "own_node" && next.nodeId) {
      lines.push(
        "",
        `${tone("You are:", "magenta")} ${tone(state.currentNode, "blue")}   ${tone("Target:", "magenta")} ${tone(next.nodeId, "blue")}`,
      );
      if (state.currentNode !== next.nodeId) {
        lines.push(
          ...wrap(
            highlightCommandHints(
              `You discovered ${next.nodeId} (e.g. via probe), but you're still on ${state.currentNode}. Use connect to move, then enum/exploit once you're there.`,
            ),
            textWrapWidth(),
          ),
        );
      }
    }
    if (suggest) lines.push("", `${tone("Try:", "cyan")} ${highlightCommandHints(suggest)}`);
    await boxPaged(tone("TUTORIAL", "bold"), lines, getUiOptions().width, t("pager_help_line"), "tutorial");
  }

  function serialize() {
    const socSave = state.socAlert
      ? (() => {
          const { __hktm_soundOnStatus: _s, ...rest } = state.socAlert;
          return rest;
        })()
      : null;
    return {
      contactAliasSeed,
      currentNode: state.currentNode,
      ownedNodes: [...state.ownedNodes],
      discoveredNodes: [...state.discoveredNodes],
      enumerated: [...state.enumerated],
      exfiltrated: [...state.exfiltrated],
      artifacts: [...state.artifacts],
      trace: state.trace,
      turns: state.turns,
      socAlert: socSave,
      lastCommand: state.lastCommand,
      lastArg: state.lastArg,
      finished: state.finished,
      result: state.result,
      exploitGatesMet: [...state.exploitGatesMet],
      mailState: state.mail.map((m) => ({ id: m.id, read: m.read })),
      ghostTriggers: { ...state.ghostTriggers },
      phishingBeatDone: Boolean(state.phishingBeatDone),
      contactContractShownInTerminal: Boolean(state.contactContractShownInTerminal),
    };
  }

  return {
    state,
    printBanner,
    showStatus,
    showMap,
    execute,
    serialize,
    showTutorialHint,
    getM1ToolTier,
    isTabCommandAllowed,
  };
}
