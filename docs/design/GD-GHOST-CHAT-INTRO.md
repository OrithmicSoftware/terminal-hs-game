# Game design — Client contact, region uplink, splash & disconnect

**Authoring intent:** the browser shell is not “a skin on the CLI.” It is the **fiction of an operator rig**: you authenticate a persona (codename + notional sector). The **Client** (protagonist contractor) reaches out through **`chat`**: same contract thread in the **terminal pager** (Node) and in the **browser drawer** (plus optional mirror to the web terminal). Short pings fire on graph/SOC beats.

## Player fantasy loop

1. **Splash** — Establishes tone before mechanics: CRT scanlines, noise, a bobbing pixel glyph, title glitch. The bar is a *promise* of load, not a real download. Skip respects speedrun / accessibility.
2. **Region selection** — Six **notional** sectors (latency / jurisdiction flavor only). No stat modifiers in v1 — this is **identity theater** and future hook space (e.g. locale intel, harder SOC in “tight” regions). Cards are readable, one-click, with a short flavor line in `title`.
3. **Codename** — Stored locally; injected into the mission banner as `OPERATOR:` so the brief feels personal. Default path avoids blocking players who mash Enter.
4. **Ghost first, brief second (mission 1 cold start)** — On a **new** op (mission 0, no save snapshot), the **operation brief** (`printBanner` / handler package) does **not** run until the player completes **initial Ghost contact**: two short bursts, then **OPEN OPERATION BRIEF**. Only then does the terminal show the formal mission title/objectives and continue into the campaign splash. Restores with a snapshot skip this gate so returning players are not blocked.
5. **Ghost chat** (ongoing) — Separate from `mail` (which is corporate / legal). Ghost is **peer voice**: colloquial, tactical, slightly unreliable. Mail is **paper trail**. Forcing the chat open on key beats prevents players from missing the fantasy that “someone is on the wire with you.”

## AI game designer consultation — applied decisions

- Rotate the **two pre-mission gate sentences** from short curated variant pools so the first contact feels alive across fresh sessions without changing the plot beat.
- Keep the Amanda referral in every intro variant so the later denial reveal still lands.
- Use a **plain-language brief request** (`What should I do?`) instead of making `/brief` the only discoverable path in the browser drawer.
- Use **Leave** as the player-facing exit label while preserving `/exit` as the typed command for terminal parity.

## Phrase inventory (shipping copy)

### Gate sentence pool A — first contact / Amanda beat

1. `You're up, {op}. Key exchange green — I'm {alias}. Your friend Amanda vouched for you — said you were the cleanest operator she knew.`
2. `Channel authenticated, {op}. I'm {alias} — a cut-out, nothing more. Amanda flagged your handle as reliable; that's the only reference I needed.`
3. `Encryption handshake confirmed. {op} — I'm {alias}. Someone named Amanda put your name in a channel she shouldn't still be watching. Curious choice of referral.`

### Gate sentence pool B — handler package cue

1. `Handler package is staged. Open it when you're ready — the terminal brief follows.`
2. `Your handler brief is queued. Open the package when you want the contract on your terminal.`
3. `The brief is waiting behind this seal. Open it when you're ready to work; the terminal gets the full contract next.`

### Browser quick replies after the brief gate

| Slot | Label | Player line | Result |
|------|-------|-------------|--------|
| 1 | `Who are you?` | `Who are you, really?` | Explains the cut-out alias arrangement. |
| 2 | `How did you find me?` | `How did you find me?` | Repeats the Amanda referral story beat. |
| 3 | `What should I do?` | `What should I do?` | Triggers the same mission brief flow as `/brief`. |
| 4 | `Leave` | `Leave` | Triggers the same standby flow as `/exit`. |

## Russian / i18n notes

- The rotating gate lines live in both `en` and `ru` dictionaries with the same array length so the browser can rotate deterministically by slot.
- `{op}` and `{alias}` are formatting tokens and must stay untranslated in every locale string.
- `/brief` and `/exit` remain slash commands even when the UI labels are localized (`Что мне делать?`, `Уйти`), so terminal and browser instructions stay aligned.
- The Russian gate variants avoid operator-gendered past tense and keep Amanda/Orithmic proper nouns intact.

## Conversation diagram

```text
[Fresh browser campaign]
        |
        v
Player opens ShadowNet IM
        |
        v
contact bubble A (rotating intro variant)
        |
        v
contact bubble B (rotating handler-package variant)
        |
        v
OPEN OPERATION BRIEF gate button
        |
        v
terminal mission brief prints + chat closes
        |
        v
Player reopens ShadowNet IM during mission 1
        |
        +--> [Who are you?] ----------> alias explanation
        |
        +--> [How did you find me?] --> Amanda referral explanation
        |
        +--> [What should I do?] -----> same flow as /brief
        |
        \--> [Leave] -----------------> same flow as /exit
```

## Forced-open beats (m1 / shared hooks)

| Trigger id      | When                         | Design goal                                      |
|-----------------|------------------------------|--------------------------------------------------|
| `edge_listed`   | First `scan` lists `gw-edge` | “The graph is real” — reward recon.              |
| `probe_gw`      | First `probe gw-edge`        | Acknowledge fingerprinting as a story beat.      |
| `connect_gw`    | First successful hop to edge | Transition: you left the safe host.            |
| `soc_alert`     | First SOC roll that sticks   | Panic + teach spoof/laylow without a modal wall.|

One-shot flags live in `ghostTriggers` in mission snapshots so reloads don’t spam.

## Terminal integration

- `chat` / header **Client chat** — Player agency; contract in terminal + drawer; forced opens add glitch + highlight.
- `chat close` — Closes drawer; does not clear history.

## Visual language

- **Glitch** — Short `body` class pulse + scanline overlay when the Client **forces** attention; not used on every message (avoid fatigue).
- **Disconnect** — Full-screen **LINK TERMINATED** after `quit`: VHS-style fade, red headline, copy ties to codename. Reinforces “session” not “page.”
- **Pixel mascot** — 8×8 CSS box-shadow “ghost” on splash; smaller cyan variant in chat header with **blink** cycle (alive, not video).

## Future hooks (not implemented)

- Region modifiers (trace budget ±1, tutorial density).
- Ghost threads keyed off `mission.chatScript[]` in JSON.
- Scripted “typing…” delays per message.

## QA notes

- Automated tests use `?e2e=1` to skip splash/intro while still loading operator profile defaults.
- Forced chat requires Web build + `__HKTM_GHOST_CHAT_HOOK` registered before mission `execute`.
