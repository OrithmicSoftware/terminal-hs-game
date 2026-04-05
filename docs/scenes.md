# Debug scenes (HKTM_DEBUG)

When `HKTM_DEBUG` is on (default), the CLI and browser terminal print a dim line after many full-screen transitions:

```text
[SCENE: <id> type=<kind> prev=<previousId>]
```

- **`type=clear`** — Full ANSI home clear (`\x1b[2J\x1b[H`) just ran; this line is the first content on the new screen.
- **`type=log`** — No clear; label only (e.g. scrollback continues).
- **`type=info`** — Same clear as `clear`, but marks glossary / `info` flows (`stepDebugKind: "info"` in `boxPaged`).
- **`type=pause`** — Emitted as `<slug>-after` before “Press Enter…”; **does not** advance the `prev=` chain (the next `clear` still points at the pager’s scene id).

Implementation: `src/debug-scene.mjs` (`sceneBannerLine`), used from `src/ui.mjs` / `src/ui-browser.mjs`.

## Runtime log

Set `HKTM_RUNTIME_SCENES_LOG=1` to append every scene line to `logs/runtime.log` (Node CLI). Legacy `HKTM_RUNTIME_STEPS_LOG` is read if `HKTM_RUNTIME_SCENES_LOG` is unset.

**User input (reproduction):** The same file also receives **`[ACTION: …]`** lines from the shared readline interface, in chronological order with scenes:

- **`shell`** — typed at the mission `>` prompt (commands, empty Enter, etc.).
- **`chat`** — line submitted while ShadowNet IM consumes input (`chat` gate).
- **`choice`** — line while a numbered choice UI is active (`waitForChoiceN`).
- **`operator`** — operator survey / codename one-shot capture.

Payload is the raw line (truncated to 500 chars). Set **`HKTM_RUNTIME_LOG_SEQ=1`** to prefix **every** log line (scene + action) with `[seq:N]` so ordering is obvious when merging streams.

Example:

```text
[seq:1] [SCENE: boot-intro type=log prev=none]
[seq:2] [ACTION: shell] scan
[seq:3] [SCENE: command-clear type=clear prev=post-splash]
```

## Scene flow (current)

### Boot + mission shell (returning player / `--checkpoint mission-shell`)

High-level order for a **cold CLI boot** into the mission shell:

```mermaid
flowchart LR
  subgraph boot["Boot sequence"]
    A["boot-intro<br/>type=log"] --> B["boot-intro-after<br/>type=pause"]
    B --> C["post-splash<br/>type=clear"]
    C --> D["operator-survey<br/>type=log"]
    D --> E["kernel-loading<br/>type=log"]
  end
  subgraph shell["Mission"]
    E --> F["boot-mission-banner<br/>type=clear"]
    F --> G["command-clear …<br/>per command"]
  end
```

### Mission 1 — all branches (cold start with chat gate)

All scene ids a runner may observe on a first-run play-through of mission 1 (`m1-ghost-proxy`). Use these ids when asserting `[SCENE: …]` lines in e2e logs (`HKTM_RUNTIME_SCENES_LOG=1`).

```mermaid
flowchart TD
  subgraph boot["Boot sequence"]
    A["boot-intro<br/>type=log"] --> B["boot-intro-after<br/>type=pause"]
    B --> C["post-splash<br/>type=clear"]
    C --> D["operator-survey<br/>type=log"]
    D --> E["kernel-loading<br/>type=log"]
  end

  subgraph gate["Chat gate (m1 cold start)"]
    E --> GH["incoming-msg-hint<br/>(no scene — text only)"]
    GH -->|"action: info chat"| IC["info-chat<br/>type=info"]
    IC --> ICA["info-chat-after<br/>type=pause"]
    ICA --> KLI["kernel-loading<br/>type=log, animate=false<br/>prev=info-chat"]
    KLI --> GH
    GH -->|"action: chat"| CGO["chat-gate-open<br/>type=clear"]
    CGO --> CGXA["chat-gate-exit-after<br/>type=pause"]
    CGXA --> KLX["kernel-loading<br/>type=log, animate=false"]
    KLX --> MB["mission-brief<br/>type=log"]
  end

  subgraph shell["Mission shell"]
    MB --> SH{{">"}}
    SH -->|"action: info phishing"| IP["info-phishing<br/>type=info"]
    IP --> IPA["info-phishing-after<br/>type=pause"]
    IPA --> PS["post-splash<br/>type=clear"]
    PS --> SH
    SH -->|"action: mail"| MCC["command-clear<br/>type=clear"]
  end

  subgraph compose["Compose mail — phishing wizard"]
    MCC --> CM1["compose-mail<br/>type=form — step 1/3: subject"]
    CM1 --> CM2["compose-mail-body<br/>type=form — step 2/3: body"]
    CM2 --> CM3["compose-mail-from<br/>type=form — step 3/3: from"]
    CM3 --> CO["compose-outbound<br/>type=clear"]
    CO --> SMTP["smtp-handshake<br/>type=clear"]
    SMTP --> MCM["mission-complete-m1<br/>type=log"]
  end
```

**Branch notes:**

- **info chat before chat:** Player may run `info chat` (or any other `info <term>`) while the chat gate is pending. The restore does **not** emit `post-splash`; instead an anonymous clear is followed immediately by `kernel-loading` (instant, `animate=false`, `prev=<last-info-scene>`). The incoming-msg-hint is reprinted after each such restore.
- **direct chat (skip info):** Player may type `chat` without running any `info` command first — the `info-chat` / `kernel-loading` restore pair is skipped; flow goes straight from `incoming-msg-hint` to `chat-gate-open`.
- **info phishing timing:** `info phishing` may be run either while the chat gate is still pending (restores to `kernel-loading` instant) or after the chat gate closes (restores to `post-splash` + mission banner).
- **compose mail step retries:** Each step of the phishing wizard re-emits its `type=form` scene on every wrong pick; `compose-mail`, `compose-mail-body`, and `compose-mail-from` may each appear multiple times before the player selects the correct option.
- **mail read:** `mail read <id>` emits a paged scene `mail-read-<id>` (e.g. `mail-read-OPS-GR-001`); the mail list itself uses only `command-clear`.

**Restore after `info`:** `post-splash` (clear) → mission banner (instant, no typing replay).

**Phishing beat (m1):** `compose-outbound` → `smtp-handshake` (clears between stages) → `mission-complete-m1` (log, no clear).

**Paginated UI:** Pagers emit `<stepBase>-1`, `-2`, … per page and `<stepBase>-exit` when leaving (help, mail read, debrief, ShadowNet `chat-contract`, `info-<term>`, tutorial pager, etc.).

**Browser campaign:** Additional clears for `next-mission-banner`, `reset-mission-banner`, `ui-pip-banner`, `ui-plain-banner`.

**Chat gate → `info` → back:** Restore does **not** emit `post-splash` (plain clear only). `runTerminalLoadingSequence({ instant: true })` logs `[SCENE: kernel-loading type=log prev=<semantic> animate=false]` where `<semantic>` is the last scene id with a trailing `-exit` removed (e.g. `info-chat-exit` → `prev=info-chat`).

**Checkpoints / game.mjs:** Names like `checkpoint-mission-shell`, `retry-banner`, `chat-gate-open`, `boot-mission-banner` — see `game.mjs` `clearTerminal(...)` calls.

---

*Ids are string labels in code, not an enum. When adding a new `clearTerminalScreen("your-id")`, pick a stable `your-id` and document it here if it is part of a player-visible flow.*
