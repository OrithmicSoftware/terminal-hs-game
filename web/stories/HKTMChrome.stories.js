/**
 * Visual reference for the browser shell (PIP chrome): header actions, step toolbar, command row.
 * Run: npm run storybook --prefix web
 */
export default {
  title: "HKTM/Chrome",
  parameters: {
    docs: {
      description: {
        component:
          "Static HTML fragments using `theme.css` — mirrors `web/index.html` structure without boot logic.",
      },
    },
  },
};

export const HeaderActions = {
  name: "Header · Sound",
  render: () => `
    <div class="chrome" style="max-width: 960px; margin: 0 auto; padding: 1rem;">
      <header style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #1f3328; padding-bottom: 0.5rem;">
        <div class="hktm-header-brand">
          <img class="hktm-game-logo" src="/favicon.svg" alt="" width="28" height="28" decoding="async" />
          <span class="title">TERMINAL HACKSIM</span>
          <span class="hktm-git-version" title="Git revision">storybook</span>
          <span class="badge">browser α</span>
        </div>
        <span class="header-actions" style="margin-left: auto; display: flex; gap: 0.5rem;">
          <button type="button" class="ghost hktm-reset-btn" data-hktm-chrome-own-sound aria-label="Reset campaign" title="Reset campaign">
            <span class="hktm-reset-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </span>
          </button>
          <button type="button" class="ghost hktm-chat-toggle" data-hktm-chrome-own-sound aria-label="ShadowNet IM" title="Chat">
            <span class="hktm-chat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </span>
          </button>
          <button type="button" class="ghost hktm-sfx-toggle" data-hktm-chrome-own-sound aria-pressed="true" aria-label="Sound effects on">
            <span class="hktm-sfx-icon hktm-sfx-icon--on" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </span>
            <span class="hktm-sfx-icon hktm-sfx-icon--off" aria-hidden="true" hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </span>
          </button>
          <button type="button" class="ghost hktm-fs-toggle" data-hktm-chrome-own-sound aria-pressed="false" aria-label="Enter fullscreen" title="Fullscreen (browser)">
            <span class="hktm-fs-icon hktm-fs-icon--enter" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </span>
            <span class="hktm-fs-icon hktm-fs-icon--exit" aria-hidden="true" hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="10" y1="14" x2="3" y2="21" />
              </svg>
            </span>
          </button>
        </span>
      </header>
    </div>
  `,
};

export const StepHistoryToolbar = {
  name: "Toolbar · Prev / Curr / Next",
  render: () => `
    <div class="chrome" style="max-width: 960px; margin: 0 auto; padding: 1rem;">
      <div class="step-history-toolbar" role="toolbar" aria-label="Command output history">
        <button type="button" class="ghost">Prev (Ctrl+←)</button>
        <button type="button" class="ghost">Curr (Ctrl+↓)</button>
        <button type="button" class="ghost">Next (Ctrl+→)</button>
      </div>
    </div>
  `,
};

export const CommandRow = {
  name: "Input row · prompt + ENTER",
  render: () => `
    <div class="chrome" style="max-width: 960px; margin: 0 auto; padding: 1rem;">
      <div class="input-row">
        <span class="prompt">&gt;</span>
        <input
          type="text"
          readonly
          value="scan"
          style="flex: 1; background: #050807; border: 1px solid #1f3328; color: #c8e6d0; font-family: inherit; font-size: 14px; padding: 0.45rem 0.6rem; border-radius: 4px;"
        />
        <button type="button" class="ghost cmd-enter">
          <span class="cmd-enter-icon" aria-hidden="true">↵</span>
          <span class="cmd-enter-label">ENTER</span>
        </button>
      </div>
    </div>
  `,
};

export const GhostStates = {
  name: "Ghost · default / disabled",
  render: () => `
    <div class="chrome" style="max-width: 960px; margin: 0 auto; padding: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <button type="button" class="ghost">Active</button>
      <button type="button" class="ghost" disabled>Disabled</button>
      <button type="button" class="ghost hktm-sfx-toggle sound-off" aria-pressed="false" aria-label="Sound effects muted">
        <span class="hktm-sfx-icon hktm-sfx-icon--on" aria-hidden="true" hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </span>
        <span class="hktm-sfx-icon hktm-sfx-icon--off" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </span>
      </button>
    </div>
  `,
};
