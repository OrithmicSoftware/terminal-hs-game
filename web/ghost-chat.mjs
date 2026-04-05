/**
 * ShadowNet IM drawer (browser) — same contract/trigger copy as terminal `chat` (see src/client-chat.mjs).
 */
import { glitchPulse } from "../src/glitch-pulse.mjs";
import { playChatSwipeClose, playChatSwipeOpen, playUiClick } from "./ui-sounds.mjs";
import { isE2eUrl } from "./intro-flow.mjs";
import { CLIENT_CHAT_TRIGGERS, getInitialGateMessages, getMissionBriefChatMessages } from "../src/client-chat.mjs";
import { t } from "../src/i18n.mjs";
import { resolveContactAlias } from "../src/contact-alias.mjs";
import { animSleep } from "../src/anim-sleep-core.mjs";

let logEl;
let rootEl;
let forced = false;
let ghostChatSeeded = false;
/** Avoid posting the same mission brief twice in one page session (refresh resets). */
let lastBriefedMissionId = null;

/** Matches `chat_reply_*` keys in i18n.mjs (survey-style enumerated replies). */
const CHAT_QUICK_REPLY_COUNT = 3;

function typingDelayMs() {
  if (isE2eUrl()) return 0;
  try {
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return 90;
    }
  } catch {
    /* ignore */
  }
  return 520 + Math.random() * 420;
}

function contactAliasOrFallback() {
  return globalThis.__HKTM_CONTACT_ALIAS ?? resolveContactAlias("hktm-default");
}

/**
 * @param {ReturnType<typeof resolveContactAlias>} alias
 */
export function syncGhostChatContactAlias(alias) {
  globalThis.__HKTM_CONTACT_ALIAS = alias;
  const el = rootEl ?? document.getElementById("hktm-ghost-chat");
  const strong = el?.querySelector?.(".hktm-chat-title strong");
  if (strong) strong.textContent = alias.tag;
}

/**
 * @param {"client" | "op" | "amanda" | "corporate" | "ghost"} role
 * @param {object} opts
 */
function buildMessageShell(role, opts = {}) {
  const div = document.createElement("div");
  div.className = `hktm-chat-msg from-${role}${opts.forced ? " forced-tag" : ""}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  const tag = opts.contactTag ?? contactAliasOrFallback().tag;
  let metaLine;
  if (role === "op") {
    metaLine = `YOU${globalThis.__HKTM_PROFILE?.codename ? ` · ${globalThis.__HKTM_PROFILE.codename}` : ""}`;
  } else if (role === "amanda") {
    metaLine = "Amanda · personal";
  } else if (role === "corporate") {
    metaLine = "ORION·INT · internal";
  } else {
    metaLine = opts.forced ? `${tag} · priority` : tag;
  }
  meta.textContent = metaLine;
  const body = document.createElement("div");
  body.className = "hktm-chat-body";
  div.appendChild(meta);
  div.appendChild(body);
  return { div, body };
}

function scrollLogToEnd() {
  if (!logEl) return;
  logEl.scrollTop = logEl.scrollHeight;
}

/**
 * Immediate append (operator / sync paths).
 * @param {"client" | "op" | "amanda" | "corporate" | "ghost"} role
 */
export function appendMessage(role, text, opts = {}) {
  if (!logEl) return;
  const { div, body } = buildMessageShell(role, opts);
  body.textContent = text;
  logEl.appendChild(div);
  scrollLogToEnd();
}

/**
 * Typing… + blinking dots, then full message (incoming roles only).
 * @param {"client" | "op" | "amanda" | "corporate" | "ghost"} role
 */
export async function appendMessageAnimated(role, text, opts = {}) {
  if (!logEl) return;
  if (role === "op") {
    appendMessage(role, text, opts);
    return;
  }
  if (isE2eUrl()) {
    appendMessage(role, text, opts);
    return;
  }

  const { div, body } = buildMessageShell(role, opts);
  body.innerHTML = `<span class="hktm-chat-typing"><span class="hktm-chat-typing-label">${escapeHtml(t("chat_typing"))}</span><span class="hktm-chat-typing-dots">...</span></span>`;
  logEl.appendChild(div);
  scrollLogToEnd();

  await animSleep(typingDelayMs());
  body.textContent = text;
  scrollLogToEnd();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openGhostChat(options = {}) {
  if (!rootEl) return;
  try {
    globalThis.__HKTM_DISMISS_CHAT_HINT?.();
  } catch {
    /* ignore */
  }
  const wasOpen = rootEl.classList.contains("hktm-open");
  if (!wasOpen) {
    playChatSwipeOpen();
  }
  forced = Boolean(options.forced);
  rootEl.classList.add("hktm-open");
  if (forced) rootEl.classList.add("hktm-forced");
  else rootEl.classList.remove("hktm-forced");
  document.body.classList.add("hktm-chat-open");
  const composeInput = rootEl.querySelector(".hktm-chat-compose input");

  const briefPending = globalThis.__HKTM_BRIEF_GATE_AWAITING_FIRST_OPEN;
  if (briefPending) {
    globalThis.__HKTM_BRIEF_GATE_AWAITING_FIRST_OPEN = false;
    const resolveGate = globalThis.__HKTM_RESOLVE_BRIEF_GATE;
    delete globalThis.__HKTM_RESOLVE_BRIEF_GATE;
    void runBriefGateSequence(resolveGate);
  } else {
    composeInput?.focus();
  }
}

export function clearMissionBriefingCache() {
  lastBriefedMissionId = null;
}

/**
 * Push the current mission brief into the drawer (linear story — no ops board).
 * @param {object} mission
 * @param {{ missionIndex: number, missionTotal: number }} ctx
 */
export async function postMissionBriefingToChat(mission, ctx) {
  if (!rootEl || !logEl) return;
  if (lastBriefedMissionId === mission.id) return;
  lastBriefedMissionId = mission.id;
  ghostChatSeeded = true;
  const lines = getMissionBriefChatMessages(mission, ctx);
  glitchPulse();
  let i = 0;
  for (const text of lines) {
    await appendMessageAnimated("client", text, { forced: i === 0 });
    i += 1;
  }
  /* Do not open the drawer — player uses `chat` or the header when ready (same as engine IM pings). */
  if (!rootEl.classList.contains("hktm-open")) {
    document.getElementById("ghost-chat-toggle")?.classList.add("hktm-chat-toggle--attention");
  }
}

export function closeGhostChat() {
  if (!rootEl) return;
  const wasOpen = rootEl.classList.contains("hktm-open");
  if (wasOpen) {
    playChatSwipeClose();
  }
  rootEl.classList.remove("hktm-open");
  rootEl.classList.remove("hktm-forced");
  document.body.classList.remove("hktm-chat-open");
  forced = false;
}

/** When not using the initial gate (save restore, e2e), keep chat from feeling empty. */
export async function seedGhostChatWelcomeIfNeeded() {
  if (ghostChatSeeded || !logEl) return;
  ghostChatSeeded = true;
  const a = contactAliasOrFallback();
  await appendMessageAnimated(
    "client",
    `Channel live. I'm ${a.displayName} — this is how we stay in contact for the contract. I'll ping you on beats.`,
    { forced: false },
  );
}

/**
 * Mission 1 cold start: gate UI runs the first time the player opens ShadowNet IM (header or `chat`).
 * Does not auto-open the drawer — campaign waits until the gate is acknowledged.
 * @param {() => void} resolveGate
 */
async function runBriefGateSequence(resolveGate) {
  if (!rootEl || !logEl) {
    resolveGate?.();
    return;
  }

  const gate = rootEl.querySelector("#hktm-chat-brief-gate");
  const btn = rootEl.querySelector("[data-hktm-chat-open-brief]");
  const compose = rootEl.querySelector(".hktm-chat-compose");
  const closeBtn = rootEl.querySelector("[data-hktm-chat-close]");
  const quickRepliesEl = rootEl.querySelector("#hktm-chat-quick-replies");

  logEl.innerHTML = "";
  ghostChatSeeded = true;

  glitchPulse();

  const alias = contactAliasOrFallback();
  const [line1, line2] = getInitialGateMessages(globalThis.__HKTM_PROFILE?.codename, alias);
  await appendMessageAnimated("client", line1, { forced: true });
  await appendMessageAnimated("client", line2, { forced: false });

  if (compose) compose.style.display = "none";
  if (quickRepliesEl) quickRepliesEl.style.display = "none";
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.35";
    closeBtn.style.pointerEvents = "none";
  }
  if (gate) gate.hidden = false;

  await new Promise((resolve) => {
    const done = async () => {
      if (gate) gate.hidden = true;
      if (compose) compose.style.display = "";
      if (quickRepliesEl) quickRepliesEl.style.display = "";
      if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.style.opacity = "";
        closeBtn.style.pointerEvents = "";
      }
      await appendMessageAnimated(
        "client",
        `Brief released to the terminal. Move clean. — ${alias.signoff}`,
        { forced: false },
      );
      closeGhostChat();
      resolve();
      resolveGate?.();
    };
    btn?.addEventListener("click", () => void done(), { once: true });
  });
}

/**
 * First cold start on mission 1: contact speaks first; mission printBanner runs only after brief gate.
 * Drawer stays closed until the player opens IM (`chat` or header); then the gate runs inside the drawer.
 * @param {{ enabled: boolean }} options enabled when mission 0 and no snapshot yet
 */
export async function waitForInitialBriefGate(options = {}) {
  if (!options.enabled) {
    await seedGhostChatWelcomeIfNeeded();
    return;
  }
  if (isE2eUrl()) {
    await seedGhostChatWelcomeIfNeeded();
    return;
  }
  if (!rootEl || !logEl) return;

  /* In case the drawer was opened during intro — close so the first open is deliberate. */
  closeGhostChat();

  return new Promise((resolve) => {
    globalThis.__HKTM_BRIEF_GATE_AWAITING_FIRST_OPEN = true;
    globalThis.__HKTM_RESOLVE_BRIEF_GATE = resolve;
  });
}

function handleEnginePayload(payload) {
  const { id, text, contactTag, sender } = payload || {};
  const script = CLIENT_CHAT_TRIGGERS[id];
  if (!script) return;
  const line = text ?? script.text;
  const from = sender ?? script.sender ?? "client";
  void (async () => {
    await appendMessageAnimated(from, line, { forced: script.force, contactTag });
    if (script.force) {
      glitchPulse();
    }
  })();
}

function wireReplyCaret(form, input) {
  const inner = form?.querySelector(".hktm-chat-compose-inner");
  if (!inner || !input) return;
  const sync = () => {
    inner.classList.toggle("hktm-chat-compose-inner--has-text", String(input.value ?? "").length > 0);
  };
  input.addEventListener("input", sync);
  input.addEventListener("focus", sync);
  input.addEventListener("blur", sync);
  sync();
}

export function initGhostChat() {
  rootEl = document.getElementById("hktm-ghost-chat");
  logEl = rootEl?.querySelector(".hktm-chat-log");
  if (!rootEl || !logEl) return;

  if (globalThis.__HKTM_CONTACT_ALIAS) {
    syncGhostChatContactAlias(globalThis.__HKTM_CONTACT_ALIAS);
  }

  globalThis.__HKTM_GHOST_CHAT_HOOK = (payload) => {
    handleEnginePayload(payload);
  };

  globalThis.__HKTM_GHOST_CHAT_OPEN = (opts) => {
    openGhostChat(opts ?? {});
  };

  globalThis.__HKTM_GHOST_CHAT_CLOSE = () => {
    closeGhostChat();
  };

  rootEl.querySelector("[data-hktm-chat-close]")?.addEventListener("click", () => {
    closeGhostChat();
  });

  document.getElementById("ghost-chat-toggle")?.addEventListener("click", () => {
    if (rootEl.classList.contains("hktm-open")) closeGhostChat();
    else openGhostChat({ forced: false });
  });

  const form = rootEl.querySelector(".hktm-chat-compose");
  const input = form?.querySelector("input");
  const send = form?.querySelector("button");

  wireReplyCaret(form, input);

  const replyButtons = [];

  /** @param {string} raw */
  const submitOperatorMessage = async (raw) => {
    const text = String(raw ?? "").trim();
    if (!text) return;
    appendMessage("op", text, { forced: false });
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (text.toLowerCase() === "/brief") {
      markReplyUsed(text);
      const ctx = globalThis.__HKTM_GET_MISSION_BRIEF_CONTEXT?.();
      const delay = isE2eUrl() ? 0 : 280;
      await animSleep(delay);
      if (!ctx?.mission) {
        await appendMessageAnimated("client", t("brief_slash_unavailable"), { forced: false });
        return;
      }
      const lines = getMissionBriefChatMessages(ctx.mission, {
        missionIndex: ctx.missionIndex,
        missionTotal: ctx.missionTotal,
      });
      for (const line of lines) {
        await appendMessageAnimated("client", line, { forced: false });
      }
      await appendMessageAnimated("client", t("brief_slash_hint_terminal"), { forced: false });
      return;
    }
    const matchedReply = replyButtons.find((r) => r.payload === text);
    if (matchedReply?.response) {
      markReplyUsed(text);
      await animSleep(400 + Math.random() * 400);
      await appendMessageAnimated("client", matchedReply.response, { forced: false });
      return;
    }
    markReplyUsed(text);
    await animSleep(400 + Math.random() * 400);
    await appendMessageAnimated(
      "client",
      "Copy. ShadowNet IM only — keep trace down.",
      { forced: false },
    );
  };

  function markReplyUsed(payload) {
    for (const r of replyButtons) {
      if (r.payload === payload && r.btn) {
        r.btn.disabled = true;
        r.btn.classList.add("hktm-reply-used");
      }
    }
  }

  const labelEl = rootEl.querySelector("#hktm-chat-quick-replies-label");
  const quickGrid = rootEl.querySelector("#hktm-chat-quick-grid");
  if (labelEl) labelEl.textContent = t("chat_quick_replies_header");
  if (quickGrid) {
    quickGrid.innerHTML = "";
    for (let i = 1; i <= CHAT_QUICK_REPLY_COUNT; i += 1) {
      const code = String(i);
      const name = t(`chat_reply_${i}_label`);
      const payload = t(`chat_reply_${i}`);
      const response = t(`chat_reply_${i}_response`) || "";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hktm-region-btn";
      b.setAttribute("aria-label", `${code}: ${name}`);
      b.innerHTML = `<span class="code">${escapeHtml(code)}</span><span class="name">${escapeHtml(name)}</span>`;
      b.addEventListener("click", () => {
        playUiClick();
        void submitOperatorMessage(payload);
      });
      quickGrid.appendChild(b);
      replyButtons.push({ code, payload, response, btn: b });
    }
  }

  rootEl.addEventListener(
    "keydown",
    (e) => {
      if (!rootEl.classList.contains("hktm-open")) return;
      const k = e.key;
      if (!/^[1-9]$/.test(k)) return;
      const num = parseInt(k, 10);
      if (num < 1 || num > CHAT_QUICK_REPLY_COUNT) return;
      const rb = replyButtons[num - 1];
      if (rb?.btn?.disabled) return;
      const active = document.activeElement;
      if (active === input) return;
      if (active?.closest?.(".hktm-chat-compose")) return;
      e.preventDefault();
      playUiClick();
      void submitOperatorMessage(t(`chat_reply_${num}`));
    },
    true,
  );

  const sendOp = async () => {
    await submitOperatorMessage(String(input?.value ?? ""));
  };

  send?.addEventListener("click", () => void sendOp());
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendOp();
    }
  });
}
