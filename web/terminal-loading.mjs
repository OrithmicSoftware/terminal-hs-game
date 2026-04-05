/**
 * First-run terminal boot overlay + post-boot “incoming message” toast (browser shell).
 */
import { t } from "../src/i18n.mjs";
import { animSleep, requestAnimTurbo } from "../src/anim-sleep-core.mjs";

const BOOT_SESSION_KEY = "hktm_terminal_boot_done";

function getBootVersion() {
  try {
    return document.querySelector("meta[name=\"hktm-git-version\"]")?.getAttribute("content") ?? "unknown";
  } catch {
    return "unknown";
  }
}

function buildBootLines() {
  const v = getBootVersion();
  return [
    t("terminal_loading_kernel").replace("%s", v),
    t("terminal_loading_line_rng"),
    t("terminal_loading_line_policy"),
    t("terminal_loading_line_handshake"),
    t("terminal_loading_line_channel"),
    t("terminal_loading_line_ready"),
  ];
}

/** @type {(() => void) | null} */
let removeKeyListener = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let autoFinishTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let toastAutoTimer = null;

/**
 * Full-screen faux terminal boot. Skippable with Enter / Space.
 * @returns {Promise<void>}
 */
export function showTerminalLoadingScreen() {
  const el = document.getElementById("hktm-terminal-loading");
  const log = document.getElementById("hktm-terminal-loading-log");
  const skipEl = document.getElementById("hktm-terminal-loading-skip");
  if (!el || !log) return Promise.resolve();

  return new Promise((resolve) => {
    log.textContent = "";
    if (skipEl) skipEl.textContent = t("terminal_loading_skip_hint");

    el.classList.remove("hktm-hidden");
    el.hidden = false;
    el.setAttribute("aria-busy", "true");

    const bar = el.querySelector(".hktm-terminal-loading-bar span");
    if (bar) {
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    }

    const lines = buildBootLines();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (autoFinishTimer) {
        clearTimeout(autoFinishTimer);
        autoFinishTimer = null;
      }
      removeKeyListener?.();
      removeKeyListener = null;
      el.classList.add("hktm-hidden");
      el.hidden = true;
      el.setAttribute("aria-busy", "false");
      resolve();
    };

    const onKeyDown = (e) => {
      const code = e.code || "";
      if (e.key === "Escape") {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        try {
          globalThis.__HKTM_PRIME_AUDIO?.();
        } catch {
          /* ignore */
        }
        finish();
        return;
      }
      const space = e.key === " " || code === "Space";
      if (!space) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      try {
        globalThis.__HKTM_PRIME_AUDIO?.();
      } catch {
        /* ignore */
      }
      requestAnimTurbo();
    };

    removeKeyListener = () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
    document.addEventListener("keydown", onKeyDown, true);

    const runLines = async () => {
      try {
        for (let i = 0; i < lines.length; i += 1) {
          if (settled) return;
          if (i > 0) await animSleep(i === 4 ? 480 : 300);
          if (settled) return;
          const line = lines[i];
          log.textContent = log.textContent ? `${log.textContent}\n${line}` : line;
        }
        if (settled) return;
        await animSleep(520);
        finish();
      } catch {
        finish();
      }
    };

    requestAnimationFrame(() => {
      void runLines();
    });

    autoFinishTimer = setTimeout(finish, 9000);
  });
}

function clearToastTimer() {
  if (toastAutoTimer) {
    clearTimeout(toastAutoTimer);
    toastAutoTimer = null;
  }
}

/** Dismiss incoming-message toast (e.g. when ShadowNet IM opens). */
export function dismissIncomingMessageHint() {
  clearToastTimer();
  const toast = document.getElementById("hktm-incoming-toast");
  const btn = document.getElementById("ghost-chat-toggle");
  toast?.classList.add("hktm-hidden");
  toast?.setAttribute("hidden", "");
  btn?.classList.remove("hktm-chat-toggle--attention");
}

/**
 * Toast after boot — suggests typing `chat` in the terminal; does not open the drawer.
 */
export function showIncomingMessageHint() {
  const toast = document.getElementById("hktm-incoming-toast");
  const textEl = document.getElementById("hktm-incoming-toast-text");
  const dismissBtn = document.getElementById("hktm-incoming-toast-dismiss");
  if (!toast || !textEl) return;

  textEl.textContent = t("chat_incoming_after_boot");
  if (dismissBtn) dismissBtn.setAttribute("aria-label", t("chat_incoming_toast_dismiss"));

  toast.classList.remove("hktm-hidden");
  toast.removeAttribute("hidden");

  const onDismiss = () => {
    dismissIncomingMessageHint();
    dismissBtn?.removeEventListener("click", onDismiss);
  };
  dismissBtn?.addEventListener("click", onDismiss, { once: true });

  clearToastTimer();
  toastAutoTimer = setTimeout(() => {
    dismissIncomingMessageHint();
  }, 22000);
}

/** @returns {boolean} */
export function shouldRunTerminalBootSequence() {
  try {
    return !sessionStorage.getItem(BOOT_SESSION_KEY);
  } catch {
    return true;
  }
}

export function markTerminalBootSequenceDone() {
  try {
    sessionStorage.setItem(BOOT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
