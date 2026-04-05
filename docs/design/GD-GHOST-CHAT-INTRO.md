# Game design — Client contact, region uplink, splash & disconnect

**Authoring intent:** the browser shell is not “a skin on the CLI.” It is the **fiction of an operator rig**: you authenticate a persona (codename + notional sector). The **Client** (protagonist contractor) reaches out through **`chat`**: same contract thread in the **terminal pager** (Node) and in the **browser drawer** (plus optional mirror to the web terminal). Short pings fire on graph/SOC beats.

## Player fantasy loop

1. **Splash** — Establishes tone before mechanics: CRT scanlines, noise, a bobbing pixel glyph, title glitch. The bar is a *promise* of load, not a real download. Skip respects speedrun / accessibility.
2. **Region selection** — Six **notional** sectors (latency / jurisdiction flavor only). No stat modifiers in v1 — this is **identity theater** and future hook space (e.g. locale intel, harder SOC in “tight” regions). Cards are readable, one-click, with a short flavor line in `title`.
3. **Codename** — Stored locally; injected into the mission banner as `OPERATOR:` so the brief feels personal. Default path avoids blocking players who mash Enter.
4. **Ghost first, brief second (mission 1 cold start)** — On a **new** op (mission 0, no save snapshot), the **operation brief** (`printBanner` / handler package) does **not** run until the player completes **initial Ghost contact**: two short bursts, then **OPEN OPERATION BRIEF**. Only then does the terminal show the formal mission title/objectives and continue into the campaign splash. Restores with a snapshot skip this gate so returning players are not blocked.
5. **Ghost chat** (ongoing) — Separate from `mail` (which is corporate / legal). Ghost is **peer voice**: colloquial, tactical, slightly unreliable. Mail is **paper trail**. Forcing the chat open on key beats prevents players from missing the fantasy that “someone is on the wire with you.”

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
