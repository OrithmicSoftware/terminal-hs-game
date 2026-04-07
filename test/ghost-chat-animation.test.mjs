/**
 * Unit tests for the improved chat typing animation (ghost-chat.mjs).
 *
 * Provides a minimal DOM shim so the browser-only module can run under Node's
 * built-in test runner without a real browser or heavy DOM library.
 */
import test from "node:test";
import assert from "node:assert/strict";

/* ── Minimal DOM shim ───────────────────────────────────────────────── */

class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.className = "";
    this.textContent = "";
    this.innerHTML = "";
    this.children = [];
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this._attrs = {};
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  querySelector() {
    return null;
  }
  setAttribute(k, v) {
    this._attrs[k] = v;
  }
  getAttribute(k) {
    return this._attrs[k] ?? null;
  }
  addEventListener() {}
  removeEventListener() {}
  closest() {
    return null;
  }
  get classList() {
    const self = this;
    return {
      add(c) {
        if (!self.className.includes(c)) self.className += (self.className ? " " : "") + c;
      },
      remove(c) {
        self.className = self.className.replace(c, "").trim();
      },
      contains(c) {
        return self.className.includes(c);
      },
      toggle(c, f) {
        if (f) this.add(c);
        else this.remove(c);
      },
    };
  }
}

/**
 * Build a mock document with a `#hktm-ghost-chat` root containing a `.hktm-chat-log` child.
 * Returns the chatLog element so tests can inspect appended messages.
 */
function installDomShim() {
  const chatLog = new MockElement("div");
  chatLog.className = "hktm-chat-log";

  const root = new MockElement("div");
  root.querySelector = (sel) => {
    if (sel === ".hktm-chat-log") return chatLog;
    return null;
  };

  globalThis.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    getElementById(id) {
      if (id === "hktm-ghost-chat") return root;
      if (id === "ghost-chat-toggle") return null;
      return null;
    },
    body: new MockElement("body"),
  };

  /* Ensure isE2eUrl() returns false so animation path is exercised. */
  globalThis.location = { search: "" };

  return { chatLog, root };
}

function teardownDomShim() {
  delete globalThis.document;
  delete globalThis.location;
  delete globalThis.localStorage;
  delete globalThis.__HKTM_CONTACT_ALIAS;
  delete globalThis.__HKTM_CHAT_GATE_INTRO_INDEX;
  delete globalThis.__HKTM_CHAT_GATE_INSTRUCTION_INDEX;
  delete globalThis.__HKTM_PROFILE;
  delete globalThis.__HKTM_GHOST_CHAT_HOOK;
  delete globalThis.__HKTM_GHOST_CHAT_OPEN;
  delete globalThis.__HKTM_GHOST_CHAT_CLOSE;
  setLanguage("en");
}

/* ── Import module under test (after shim so static refs resolve) ── */

const { chatLog: sharedLog } = installDomShim();

const {
  initGhostChat,
  appendMessage,
  appendMessageAnimated,
} = await import("../web/ghost-chat.mjs");

import { getChatQuickReplies, getInitialGateMessages } from "../src/client-chat.mjs";
import { setLanguage, t } from "../src/i18n.mjs";

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Recursively collect all descendants of an element. */
function descendants(el) {
  const result = [];
  for (const child of el.children ?? []) {
    result.push(child);
    result.push(...descendants(child));
  }
  return result;
}

/** Check if an element has a specific class (word boundary match). */
function hasClass(el, cls) {
  return (el.className ?? "").split(/\s+/).includes(cls);
}

/** Find first descendant matching a class name. */
function findByClass(el, cls) {
  return descendants(el).find((d) => hasClass(d, cls));
}

/** Find all descendants matching a class name. */
function findAllByClass(el, cls) {
  return descendants(el).filter((d) => hasClass(d, cls));
}

/* ── Tests ────────────────────────────────────────────────────────── */

test("initGhostChat sets up logEl from DOM", () => {
  initGhostChat();
  /* After init, appendMessage should work (logEl is set). */
  appendMessage("op", "hello");
  assert.equal(sharedLog.children.length, 1);
  const msg = sharedLog.children[0];
  const body = findByClass(msg, "hktm-chat-body");
  assert.ok(body, "message should have a chat body element");
  assert.equal(body.textContent, "hello");
});

test("appendMessage (op) appears instantly without typing indicator", () => {
  const before = sharedLog.children.length;
  appendMessage("op", "instant message");
  assert.equal(sharedLog.children.length, before + 1);
  const msg = sharedLog.children[sharedLog.children.length - 1];
  const body = findByClass(msg, "hktm-chat-body");
  assert.equal(body.textContent, "instant message");
  /* No typing dots should be present. */
  const dots = findAllByClass(msg, "hktm-chat-typing-dot");
  assert.equal(dots.length, 0, "op messages should not have typing dots");
});

test("appendMessageAnimated (op role) skips typing indicator", async () => {
  const before = sharedLog.children.length;
  await appendMessageAnimated("op", "operator says hi");
  assert.equal(sharedLog.children.length, before + 1);
  const msg = sharedLog.children[sharedLog.children.length - 1];
  const body = findByClass(msg, "hktm-chat-body");
  assert.equal(body.textContent, "operator says hi");
});

test("appendMessageAnimated (client) shows typing indicator with 3 individual dots then reveals text", async () => {
  const before = sharedLog.children.length;
  const p = appendMessageAnimated("client", "contract brief");

  /* During the typing phase (before promise resolves) the message is appended. */
  assert.equal(sharedLog.children.length, before + 1, "message shell should be appended immediately");
  const msg = sharedLog.children[sharedLog.children.length - 1];
  const body = findByClass(msg, "hktm-chat-body");

  /* Body should contain the typing indicator, not the final text. */
  const typingLabel = findByClass(msg, "hktm-chat-typing-label");
  assert.ok(typingLabel, "should have a typing label element");
  assert.equal(typingLabel.textContent, t("chat_typing"));

  const dots = findAllByClass(msg, "hktm-chat-typing-dot");
  assert.equal(dots.length, 3, "should have exactly 3 individual dot elements");
  for (const dot of dots) {
    assert.equal(dot.textContent, ".", "each dot should contain a period");
  }

  /* Wait for animation to complete. */
  await p;

  /* After animation, body should contain the final message text. */
  assert.equal(body.textContent, "contract brief");
});

test("appendMessageAnimated (amanda) also shows typing dots", async () => {
  const before = sharedLog.children.length;
  const p = appendMessageAnimated("amanda", "watch your back");
  const msg = sharedLog.children[sharedLog.children.length - 1];

  /* Should show typing indicator during animation. */
  const dots = findAllByClass(msg, "hktm-chat-typing-dot");
  assert.equal(dots.length, 3, "amanda messages should also get 3 typing dots");

  await p;
  const body = findByClass(msg, "hktm-chat-body");
  assert.equal(body.textContent, "watch your back");
});

test("sequential animated messages each go through typing → reveal cycle", async () => {
  const before = sharedLog.children.length;

  /* First message */
  const p1 = appendMessageAnimated("client", "first sentence");
  assert.equal(sharedLog.children.length, before + 1);
  const msg1 = sharedLog.children[sharedLog.children.length - 1];
  const dots1 = findAllByClass(msg1, "hktm-chat-typing-dot");
  assert.equal(dots1.length, 3, "first message should show typing dots");
  await p1;
  const body1 = findByClass(msg1, "hktm-chat-body");
  assert.equal(body1.textContent, "first sentence");

  /* Second message */
  const p2 = appendMessageAnimated("client", "second sentence");
  assert.equal(sharedLog.children.length, before + 2);
  const msg2 = sharedLog.children[sharedLog.children.length - 1];
  const dots2 = findAllByClass(msg2, "hktm-chat-typing-dot");
  assert.equal(dots2.length, 3, "second message should show typing dots");
  await p2;
  const body2 = findByClass(msg2, "hktm-chat-body");
  assert.equal(body2.textContent, "second sentence");
});

test("typing dots container has hktm-chat-typing-dots class", async () => {
  const before = sharedLog.children.length;
  const p = appendMessageAnimated("corporate", "compliance alert");
  const msg = sharedLog.children[sharedLog.children.length - 1];

  const container = findByClass(msg, "hktm-chat-typing-dots");
  assert.ok(container, "dots should be wrapped in a hktm-chat-typing-dots container");
  assert.equal(container.children.length, 3, "container should hold 3 dot elements");

  await p;
});

test("message role classes are set correctly", async () => {
  appendMessage("op", "op msg");
  const opMsg = sharedLog.children[sharedLog.children.length - 1];
  assert.ok(opMsg.className.includes("from-op"), "op message should have from-op class");

  await appendMessageAnimated("client", "client msg");
  const clientMsg = sharedLog.children[sharedLog.children.length - 1];
  assert.ok(clientMsg.className.includes("from-client"), "client message should have from-client class");

  await appendMessageAnimated("amanda", "amanda msg");
  const amandaMsg = sharedLog.children[sharedLog.children.length - 1];
  assert.ok(amandaMsg.className.includes("from-amanda"), "amanda message should have from-amanda class");
});

test("initial gate messages rotate from localized phrase pools", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };
  setLanguage("en");
  delete globalThis.__HKTM_CHAT_GATE_INTRO_INDEX;
  delete globalThis.__HKTM_CHAT_GATE_INSTRUCTION_INDEX;

  const alias = { displayName: "E. Forester" };
  const [line1, line2] = getInitialGateMessages("Nyx", alias);

  assert.match(line1, /You're up, Nyx\..*I'm E\. Forester\./);
  assert.match(line2, /Handler package is staged\./);
  assert.equal(storage.get("hktm_chat_gate_intro_i"), "1");
  assert.equal(storage.get("hktm_chat_gate_instruction_i"), "1");

  delete globalThis.__HKTM_CHAT_GATE_INTRO_INDEX;
  delete globalThis.__HKTM_CHAT_GATE_INSTRUCTION_INDEX;

  const [rotatedLine1, rotatedLine2] = getInitialGateMessages("Nyx", alias);
  assert.match(rotatedLine1, /Channel authenticated, Nyx\./);
  assert.match(rotatedLine2, /Your handler brief is queued\./);

  delete globalThis.localStorage;
});

test("chat quick replies expose brief and leave actions with russian support", () => {
  setLanguage("ru");
  const replies = getChatQuickReplies();

  assert.equal(replies.length, 4);
  assert.deepEqual(
    replies.map((reply) => ({ label: reply.label, action: reply.action })),
    [
      { label: "Кто ты?", action: "" },
      { label: "Как нашёл меня?", action: "" },
      { label: "Что мне делать?", action: "brief" },
      { label: "Уйти", action: "exit" },
    ],
  );

  delete globalThis.__HKTM_CHAT_GATE_INTRO_INDEX;
  delete globalThis.__HKTM_CHAT_GATE_INSTRUCTION_INDEX;
  const [line1, line2] = getInitialGateMessages("Оператор", { displayName: "Е. Форестер" });
  assert.match(line1, /Оператор/);
  assert.match(line2, /терминал/);
  setLanguage("en");
});

/* Cleanup */
test.after(() => {
  teardownDomShim();
});
