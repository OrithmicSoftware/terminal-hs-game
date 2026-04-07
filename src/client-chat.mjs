/**
 * Contract contact (protagonist contractor) — same copy for terminal `chat` pager and browser chat UI.
 * Display name is procedural from the campaign seed (see contact-alias.mjs).
 */

import { formatContactTemplate } from "./contact-alias.mjs";
import { t } from "./i18n.mjs";

const CHAT_GATE_ROTATION_KEYS = {
  intro: {
    global: "__HKTM_CHAT_GATE_INTRO_INDEX",
    storage: "hktm_chat_gate_intro_i",
  },
  instruction: {
    global: "__HKTM_CHAT_GATE_INSTRUCTION_INDEX",
    storage: "hktm_chat_gate_instruction_i",
  },
};

function getRotatingPhrase(key, rotationKey) {
  const arr = t(key);
  const variants = Array.isArray(arr) ? arr.filter((v) => typeof v === "string" && v.trim()) : [];
  if (!variants.length) return "";
  const { global: globalKey, storage: storageKey } = CHAT_GATE_ROTATION_KEYS[rotationKey] ?? {};
  let idx = Number.isFinite(globalThis[globalKey]) ? globalThis[globalKey] : NaN;
  if (!Number.isFinite(idx)) {
    idx = 0;
    try {
      if (typeof globalThis.localStorage !== "undefined" && storageKey) {
        const prev = parseInt(globalThis.localStorage.getItem(storageKey) ?? "0", 10);
        idx = (Number.isFinite(prev) ? prev : 0) % variants.length;
        globalThis.localStorage.setItem(storageKey, String((idx + 1) % variants.length));
      } else {
        idx = Math.floor(Math.random() * variants.length);
      }
    } catch {
      idx = Math.floor(Math.random() * variants.length);
    }
    if (globalKey) globalThis[globalKey] = idx;
  }
  return variants[idx % variants.length];
}

function formatGatePhrase(text, vars) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

/**
 * In-mission pings (same text in terminal stream and browser drawer).
 * `sender`: IM thread — contract client, childhood-friend Amanda, or in-house corporate warn path.
 */
export const CLIENT_CHAT_TRIGGERS = {
  edge_listed: {
    text: "Edge host gw-edge is on your scan. I'm watching — move before Orion rebalances. — {signoff}",
    force: true,
    sender: "client",
  },
  probe_gw: {
    text: "Fingerprint in. That SSH face is staging — good. Don't burn enum cycles for fun. — {signoff}",
    force: true,
    sender: "client",
  },
  /** Fires once after probe gw-edge — personal thread. Player was told Amanda referred them; she denies it. */
  amanda_reunion: {
    text: "Hey — it's Amanda. Saw your handle light up on a feed I keep for old friends. You're back in the game? Be careful out there. — A",
    force: true,
    sender: "amanda",
  },
  /** Auto-fired as the player's reply to Amanda after reunion — sets up the denial beat. */
  amanda_lead_thanks: {
    text: "Thanks for the lead, by the way — the contract contact said you vouched for me.",
    force: false,
    sender: "op",
  },
  amanda_lead_denial: {
    text: "Wait — what? I never passed your name to anyone. I don't know who told you that. Someone used me as a reference without asking. That's… not great. Watch your back. — A",
    force: true,
    sender: "amanda",
  },
  connect_gw: {
    text: "You're on the edge router. Contract clock is live; next hop is app — steady hands. — {signoff}",
    force: true,
    sender: "client",
  },
  /** In-corporate line via client cut-out — tracking / compliance pressure. */
  soc_alert: {
    text: "Internal composite: risk telemetry is correlating your session with behavioral flags. Your client's cut-out asked me to forward this — dial back noisy probes, or compliance will force a lockdown on the edge. — ORION·INT",
    force: true,
    sender: "corporate",
  },
  /** Dynamic text supplied by engine (`text` override) when an active SOC alert expires. */
  soc_escalation: {
    text: "",
    force: true,
    sender: "corporate",
  },
  /** Amanda — personal security hints (trace / SOC); delivered through ShadowNet IM only on web. */
  amanda_trace_guarded: {
    text: "Hey — it's Amanda. Your footprint is climbing on the trace meter. If Orion isn't blind, assume you're on a curve — cover or laylow when you can. — A",
    force: false,
    sender: "amanda",
  },
  amanda_trace_pressure: {
    text: "Amanda — you're in the mid-band on trace. That's not a flex; that's exposure. Spoof alerts or cool off before you kiss the ceiling. — A",
    force: true,
    sender: "amanda",
  },
  amanda_trace_critical: {
    text: "Amanda — you're one loud move from burning this session. Stop probing for sport; submit or scrub. — A",
    force: true,
    sender: "amanda",
  },
  amanda_soc_personal: {
    text: "Amanda — I saw the compliance ping on your channel. That means SOC is watching. You know what spoof and laylow are for — don't ignore the timer. — A",
    force: true,
    sender: "amanda",
  },
  phishing_harvest: {
    text: "Harvest logged. That password is your staging ticket — enum local, then weak-ssh before the edge will talk to you. — {signoff}",
    force: true,
    sender: "client",
  },
  post_phish_next_mission: {
    text: "Clean hit. First task complete. I stored the harvested credential in your local secrets. Open your next brief in chat: we'll log into Orion's internal segment, pull user files with rsync, and run grep across those dumps for more secrets. — {signoff}",
    force: true,
    sender: "client",
  },
};

/**
 * @param {string} id
 * @param {object} alias resolved contact alias (see resolveContactAlias)
 */
export function formatContactChatLine(id, alias) {
  const trig = CLIENT_CHAT_TRIGGERS[id];
  if (!trig) return "";
  return formatContactTemplate(trig.text, alias);
}

/**
 * First mission after m1 (campaign index 1): new ShadowNet IM session with handoff copy + next contract.
 * @param {object} mission
 * @param {number} missionIndex
 */
export function isM2HandoffContract(mission, missionIndex) {
  return missionIndex === 1 && mission?.id !== "m1-ghost-proxy";
}

/**
 * Full contract thread for `chat` (terminal boxPaged + browser can mirror).
 * @param {object} mission
 * @param {ReturnType<import("./contact-alias.mjs").resolveContactAlias>} alias
 * @param {{ missionIndex?: number, missionTotal?: number }} [ctx]
 */
export function getContactContractLines(mission, alias, ctx = {}) {
  const story = mission.story ?? {};
  const handler = story.handler?.name ?? "Handler";
  const region = story.region ?? "—";
  const missionIndex = ctx.missionIndex ?? 0;
  const intro = [
    `FROM: ${alias.displayName} (encrypted uplink)`,
    `Handler cut-out: ${handler} · Region context: ${region}`,
    "",
    `Contract: «${mission.title}»`,
    "",
  ];
  const handoff = isM2HandoffContract(mission, missionIndex)
    ? [t("chat_contract_post_m1_congrats"), "", t("chat_contract_post_m1_next_op"), ""]
    : [];
  const body = [
    mission.brief,
    "",
    `Objective: ${mission.objective.summary}`,
    "",
    `Trace budget (sim): ${mission.security?.maxTrace ?? "—"}`,
    "",
    "You took this op through this channel. No real networks; payment is the story. Use `chat` anytime to reread the contract.",
  ];
  return [...intro, ...handoff, ...body];
}

/**
 * First-contact lines before the formal mission banner (browser gate only).
 * @param {string} codename
 * @param {ReturnType<import("./contact-alias.mjs").resolveContactAlias>} alias
 */
export function getInitialGateMessages(codename, alias) {
  const op = codename?.trim() || "operator";
  const vars = {
    op,
    alias: alias.displayName,
  };
  return [
    formatGatePhrase(getRotatingPhrase("chat_gate_intro_variants", "intro"), vars),
    formatGatePhrase(getRotatingPhrase("chat_gate_instruction_variants", "instruction"), vars),
  ];
}

export function getChatQuickReplies() {
  const replies = [];
  for (let i = 1; i < 10; i += 1) {
    const labelKey = `chat_reply_${i}_label`;
    const payloadKey = `chat_reply_${i}`;
    const responseKey = `chat_reply_${i}_response`;
    const actionKey = `chat_reply_${i}_action`;
    const label = t(labelKey);
    const payload = t(payloadKey);
    if (label === labelKey || payload === payloadKey) break;
    const response = t(responseKey);
    const action = t(actionKey);
    replies.push({
      code: String(i),
      label,
      payload,
      response: response === responseKey ? "" : response,
      action: action === actionKey ? "" : action,
    });
  }
  return replies;
}

/**
 * Step-by-step mission brief as short chat bubbles (browser) or echoed lines (Node).
 * @param {object} mission
 * @param {{ missionIndex: number, missionTotal: number }} ctx
 */
export function getMissionBriefChatMessages(mission, ctx) {
  const story = mission.story ?? {};
  const handler = story.handler?.name ?? "Handler";
  const region = story.region ?? "—";
  const step = ctx.missionIndex + 1;
  const total = ctx.missionTotal;
  /** @type {string[]} */
  const msgs = [
    `Step ${step}/${total} — «${mission.title}»`,
    `Handler cut-out: ${handler} · Region: ${region}`,
  ];
  const brief = String(mission.brief ?? "").trim();
  if (brief) {
    const paras = brief
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras.length) msgs.push(...paras);
    else msgs.push(brief);
  }
  msgs.push(`Objective: ${mission.objective.summary}`);
  msgs.push(`Trace cap (sim): ${mission.security?.maxTrace ?? "—"}`);
  msgs.push(t("brief_next_hint_phish_or_compose"));
  msgs.push(t("brief_mail_and_chat_closure"));
  return msgs;
}
