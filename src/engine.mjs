import { tone, meter } from "./colors.mjs";
import { boxPaged, pagedPlainLines, wrap, getUiOptions, notifyBell } from "./ui.mjs";
import { t } from "./i18n.mjs";
import { INFO_GLOSSARY } from "./info-glossary.mjs";

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
const LOADING_ANIM_SPEED_WEB = 220;

/** Web: SSH theater + link bar wall-clock budget (ms). Keep generous so the link bar is not starved after SSH lines. */
const WEB_CONNECT_SCENE_MAX_MS = 14000;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function webLoadingTick() {
  if (!isWebUi() || typeof globalThis.__HKTM_LOADING_TICK !== "function") return;
  try {
    globalThis.__HKTM_LOADING_TICK();
  } catch {
    /* ignore */
  }
}

async function loading(label, ms) {
  if (!useAnimEnabled() || ms <= 0) return;

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

  process.stdout.write(`${tone(frames[0], "cyan")} ${label}`);
  webLoadingTick();
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${tone(frames[i], "cyan")} ${label}`);
    webLoadingTick();
  }, frameMs);

  try {
    await sleep(durationMs);
  } finally {
    clearInterval(timer);
    const elapsed = Date.now() - started;
    process.stdout.write(`\r${tone("✔", "green")} ${label} ${tone(`(${elapsed}ms)`, "dim")}\n`);
    webLoadingTick();
  }
}

/** OpenSSH-style host-key prompts (fiction); auto-“yes” for pacing. */
async function printSshConnectTheater(toId) {
  const ui = getUiOptions();
  const pace = isWebUi() ? 0.42 : 1;
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
    await sleep(lineMs);
  }
  console.log(
    tone("(simulation) ", "dim") +
      tone('typing "yes" — StrictHostKeyChecking policy auto-accepted for this op.', "green"),
  );
  await sleep(Math.floor((ui.mode === "pip" ? 320 : 240) * pace));
  console.log(
    tone(`Warning: Permanently added '${toId}' (${fakeIp}) to the list of known hosts.`, "yellow"),
  );
  await sleep(Math.floor((ui.mode === "pip" ? 220 : 160) * pace));
  console.log(
    tone("Enter passphrase for key '/home/operator/.ssh/covert_ed25519': ", "dim") +
      tone("[agent forwarded — empty return]", "green"),
  );
  await sleep(Math.floor((ui.mode === "pip" ? 380 : 260) * pace));
  console.log(tone(`Last login: simulated session from ${fakeIp}`, "dim"));
  await sleep(Math.floor((ui.mode === "pip" ? 140 : 100) * pace));
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
    (ui.mode === "pip" ? 5200 : 3400) * (isWebUi() ? 0.48 : 1),
  );
  let totalMs = baseBarMs;
  if (isWebUi()) {
    const reserveFinalMs = 140;
    const remaining = WEB_CONNECT_SCENE_MAX_MS - sshElapsed - reserveFinalMs;
    totalMs = Math.min(baseBarMs, Math.max(0, remaining));
    if (totalMs < 900) totalMs = Math.min(baseBarMs, 900);
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
    await sleep(frameMs);
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
  await sleep(160);
  process.stdout.write("\r" + " ".repeat(clearPad) + "\r");
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

export function createMissionSession(mission, initialSnapshot = null) {
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
      console.log(`${tone("[SOC]", "red")} ${tone(alert.reason, "yellow")}`);
    }
  }

  function progressSocAlert() {
    if (!state.socAlert) return;
    state.socAlert.turnsRemaining -= 1;
    if (state.socAlert.turnsRemaining <= 0) {
      const penalty = state.socAlert.severity === "high" ? 3 : 2;
      addTrace(penalty);
      console.log(
        `${tone("[SOC]", "red")} Alert escalated. Additional trace +${penalty}.`,
      );
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

  /** Remote port sweep after `probe <host>` — open ports + guesses only; no CVE/exploit mapping (that is `enum` on-host). */
  function printPortSweep(hostId, n) {
    const svcs = n.services ?? [];
    if (svcs.length === 0) {
      console.log(tone(`No exposed listener ports on ${hostId} (passive / local).`, "dim"));
      return;
    }
    console.log(
      `\n${tone(`Remote port sweep — ${hostId}`, "bold")}  ${tone("(from your foothold; no shell on target yet)", "dim")}`,
    );
    console.log(
      `${tone("PORT/PROTO", "dim")}   ${tone("STATE", "dim")}   ${tone("REMOTE NOTE", "dim")}`,
    );
    for (const s of svcs) {
      const p = `${s.port}/${serviceProtocol(s)}`;
      const svcName = s.name ?? "?";
      const label = `${p} ${svcName}`;
      console.log(
        `${tone(label.padEnd(22), "cyan")} ${tone("open", "green")}   ${tone("listener / banner guess only", "dim")}`,
      );
    }
    console.log(
      tone(
        "Probe does not map CVE classes or exploit ids — that requires an on-host session. Flow: discover (scan) → remote sweep (probe) → connect → enum → exploit (then pivot, cat intel, stash artifacts, or chain e.g. SQL → creds → another host).",
        "dim",
      ),
    );
    const hop = connectHopBlocked(state.currentNode, hostId);
    if (hop.blocked && hop.gate?.afterExploit) {
      const g = hop.gate.afterExploit;
      console.log(
        `\n${tone("Tip:", "dim")} ${tone(`connect ${hostId}`, "cyan")} is blocked until ${tone(`exploit ${g.exploitId}`, "yellow")} on ${tone(g.node, "blue")} (staging). After the hop: ${tone("enum", "cyan")} on ${hostId} for ${tone("exploit <id>", "yellow")} mapping.`,
      );
    } else {
      console.log(
        `\n${tone("Tip:", "dim")} ${tone("connect", "cyan")} ${hostId}, then ${tone("enum", "cyan")} on that host to list ${tone("exploit <id>", "yellow")} per port before ${tone("exploit", "cyan")}.`,
      );
    }
  }

  async function printBanner() {
    const story = mission.story ?? {};
    const cw = textWrapWidth();
    const handler = story.handler?.name ? `${story.handler.name}` : "Handler";
    const time = story.time ?? "02:13";
    const region = story.region ?? "unknown sector";
    const lines = [
      ...wrap(`${tone("HANDLER:", "magenta")} ${handler}`, cw),
      ...wrap(`${tone("TIME:", "magenta")} ${time}   ${tone("REGION:", "magenta")} ${region}`, cw),
      "",
      ...wrap(`${tone("BRIEF:", "magenta")} ${mission.brief}`, cw),
      ...wrap(`${tone("OBJECTIVE:", "magenta")} ${mission.objective.summary}`, cw),
      ...wrap(`${tone("TRACE BUDGET:", "magenta")} ${String(mission.security.maxTrace)}`, cw),
      "",
      ...wrap(`Type ${tone("help", "cyan")} for commands. Type ${tone("tutorial", "cyan")} for guided mode.`, cw),
    ];
    console.log("");
    await boxPaged(tone(mission.title, "bold"), lines, getUiOptions().width, t("pager_help_line"));
  }

  function showStatus() {
    console.log(`\n${tone("Status", "bold")}`);
    console.log(`Node: ${tone(state.currentNode, "blue")}`);
    console.log(`Turns: ${state.turns}`);
    console.log(`Trace: ${meter(state.trace, mission.security.maxTrace)}`);
    console.log(`Owned: ${[...state.ownedNodes].join(", ")}`);
    console.log(`Exfil: ${state.exfiltrated.size}/${mission.objective.exfilFiles.length}`);
    if (state.socAlert) {
      console.log(
        `${tone("SOC Alert:", "red")} ${state.socAlert.severity} (${state.socAlert.turnsRemaining} turns to react)`,
      );
    }
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
    const lines = [
      tone("Commands", "bold"),
      `  ${tone("help", "cyan")}                 show commands`,
      `  ${tone("clear", "cyan")}                clear screen and reprint header/status`,
      `  ${tone("status", "cyan")}               show current status`,
      `  ${tone("map", "cyan")}                  show discovered network graph`,
      `  ${tone("scan", "cyan")}                 list adjacent hosts (no arguments)`,
      `  ${tone("probe <host>", "cyan")}         remote port sweep (open ports; no exploit ids)`,
      `  ${tone("connect <node>", "cyan")}       move to discovered adjacent node`,
      `  ${tone("enum", "cyan")}                 on-host: map ports → exploit ids + vuln class`,
      `  ${tone("enum -f / --force", "cyan")}    re-scan (costs trace again; use if you need fresh output)`,
      `  ${tone("exploit <id>", "cyan")}         run exploit on current node`,
      `  ${tone("info <term>", "cyan")}           glossary: every command + concepts (try: info help)`,
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
    await pagedPlainLines(lines, t("pager_help_line"));
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

  /** Fictional mapping: wargame input → ssh / psql strings (education only; no DB runs). */
  function runSqlSimulator(raw) {
    const arg = String(raw ?? "").trim();
    if (!arg) {
      console.log(tone("SQL mapping lab (fictional; compare naive concat vs bind)", "bold"));
      console.log(`  ${tone("sql demo", "cyan")}                — OR 1=1 style login bypass`);
      console.log(`  ${tone(`sql translate "…"`, "cyan")}  — your text → transport + naive psql line`);
      console.log(tone("Intel: cat /opt/intel/sql-bridge-note.txt on app-api (when owned).", "dim"));
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
    console.log("Try: sql demo   or   sql translate \"your text\"");
    return 0;
  }

  async function clearScreen() {
    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[2J\x1b[H");
    } else {
      console.log("\n".repeat(20));
    }
    await printBanner();
  }

  function printKnownInfoTerms() {
    const keys = Object.keys(INFO_GLOSSARY).sort();
    const cw = textWrapWidth();
    console.log(tone("Known terms:", "dim"));
    for (const line of wrap(keys.join(", "), cw)) {
      console.log(tone(line, "dim"));
    }
  }

  async function info(termRaw) {
    const term = String(termRaw ?? "").trim().toLowerCase();
    if (!term) {
      console.log("Usage: info <term>. Example: info probe");
      printKnownInfoTerms();
      return;
    }

    const entry = INFO_GLOSSARY[term] ?? null;
    if (!entry) {
      console.log("Unknown term.");
      printKnownInfoTerms();
      return;
    }

    const cw = textWrapWidth();
    const bodyLines = [...wrap(entry.about, cw), "", ...wrap(entry.exploit, cw)];
    await boxPaged(tone(`INFO: ${term}`, "bold"), bodyLines, getUiOptions().width, t("pager_help_line"));
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
      console.log(`\n${tone("Adjacent hosts (not fingerprinted yet — run port sweep)", "bold")}`);
      for (const id of undiscovered) {
        console.log(
          `- ${tone(id, "blue")}  (${tone("port sweep:", "dim")} ${tone(`probe ${id}`, "cyan")})`,
        );
      }
    }

    if (discovered.length > 0) {
      console.log(`\n${tone("Adjacent hosts (already discovered)", "bold")}`);
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
        console.log(`Tip: search for credential artifacts via ${tone("cat", "cyan")} on intel files, then check ${tone("stash", "cyan")}.`);
        addTrace(1);
        return 1;
      }
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
    return 0;
  }

  function laylow() {
    const drop = state.socAlert ? 1 : 2;
    state.trace = Math.max(0, state.trace - drop);
    if (state.socAlert) {
      state.socAlert.turnsRemaining = Math.max(1, state.socAlert.turnsRemaining - 1);
    }
    console.log(`${tone("Staying dark...", "dim")} Trace reduced by ${drop}.`);
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
      );
      state.finished = true;
      state.result = "success";
      return 0;
    }
    state.finished = true;
    state.result = "success";
    return 0;
  }

  async function execute(inputLine) {
    if (state.finished) {
      console.log("Mission already resolved. Use campaign controls (retry/quit).");
      return;
    }

    const line = inputLine.trim();
    if (!line) return;
    const [command, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    state.lastCommand = command.toLowerCase();
    state.lastArg = arg;

    state.turns += 1;
    let risk = 0;

    switch (command.toLowerCase()) {
      case "help":
        await help();
        break;
      case "clear":
        await clearScreen();
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
            `${tone("Usage:", "dim")} ${tone("scan", "cyan")} — list adjacent hosts (no arguments). ${tone("probe <host>", "cyan")} — remote port sweep.`,
          );
          risk = 0;
          break;
        }
        await loading("Sweeping adjacent targets...", 260);
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
        await loading(`Port sweep ${host}...`, 220);
        risk = probeTarget(host);
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
          await loading(`Enumerating services on ${state.currentNode}...`, 320);
        }
        risk = enumerate(arg);
        break;
      }
      case "exploit":
        await loading(`Deploying exploit ${arg}...`, 520);
        risk = exploit(arg);
        break;
      case "info":
        await info(arg);
        break;
      case "sql":
        await loading("Resolving SQL bridge (fictional mapping)...", 180);
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
      case "quit":
        state.finished = true;
        state.result = "aborted";
        console.log("Campaign session closed.");
        break;
      default:
        console.log(`Unknown command: ${command}`);
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

    showStatus();

    if (state.finished && state.result === "failed" && mission.story?.debrief?.fail) {
      await boxPaged(
        tone("DEBRIEF", "bold"),
        wrap(mission.story.debrief.fail, textWrapWidth()),
        getUiOptions().width,
        t("pager_help_line"),
      );
    }
  }

  async function showTutorialHint() {
    if (!mission.tutorial?.steps?.length) {
      console.log("No tutorial is available for this mission.");
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
    if (next.text) lines.push(...wrap(next.text, textWrapWidth()));
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
            `You discovered ${next.nodeId} (e.g. via probe), but you're still on ${state.currentNode}. Use connect to move, then enum/exploit once you're there.`,
            textWrapWidth(),
          ),
        );
      }
    }
    if (suggest) lines.push("", `${tone("Try:", "cyan")} ${tone(suggest, "yellow")}`);
    await boxPaged(tone("TUTORIAL", "bold"), lines, getUiOptions().width, t("pager_help_line"));
  }

  function serialize() {
    return {
      currentNode: state.currentNode,
      ownedNodes: [...state.ownedNodes],
      discoveredNodes: [...state.discoveredNodes],
      enumerated: [...state.enumerated],
      exfiltrated: [...state.exfiltrated],
      artifacts: [...state.artifacts],
      trace: state.trace,
      turns: state.turns,
      socAlert: state.socAlert,
      lastCommand: state.lastCommand,
      lastArg: state.lastArg,
      finished: state.finished,
      result: state.result,
      exploitGatesMet: [...state.exploitGatesMet],
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
  };
}
