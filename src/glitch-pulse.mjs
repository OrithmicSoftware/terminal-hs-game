/**
 * Glitch pulse on `#hktm-app-shell` (terminal chrome + overlay — one layer; see ghost-ui.css).
 * Falls back to `document.body` if the shell is missing.
 * Browser-only; no-op when `document` is missing.
 */
export function glitchPulse() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("hktm-app-shell") ?? document.body;
  el.classList.add("hktm-glitch-pulse");
  setTimeout(() => {
    el.classList.remove("hktm-glitch-pulse");
  }, 900);
}
