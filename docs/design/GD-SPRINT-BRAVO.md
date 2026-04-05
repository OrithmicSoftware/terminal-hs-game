# Game design sprint — “Bravo” (shell, audio, mail fantasy)

**Role:** Lead game designer (systems + narrative).  
**Estimated effort logged:** **8.0h** (equivalent to one full design day + review).  
**Focus:** Player fantasy, **verb** consistency, **diegetic mail**, and **sensory** feedback alignment with the web shell.

---

## Block 1 (1.0h) — Player fantasy audit

| Layer | Question | Answer |
|-------|----------|--------|
| Who | Who is the player? | **Operator** — contract pentester, not “script kiddie omnipotence” |
| Why | Why terminals? | **Legibility** — trace, SOC, graph are *readable* mechanics |
| Failure | What feels fair? | Trace + SOC + retry — not RNG death |

**Design principle:** *“If it’s not in the shell, it doesn’t exist.”* Mail is **in-game** text, not a second app.

---

## Block 2 (1.0h) — Verb & command matrix (delta)

| Command | Player intent | Fantasy |
|---------|---------------|---------|
| `mail` | “What did HQ send?” | **Deployed package** |
| `mail read <id>` | “Open brief” | **Pager** = secure terminal viewer |
| `scan` | Map neighbors | **Passive discovery** (no exploit) |
| `probe` | Remote sweep | **Noisy** — SOC risk |

**GD note:** `mail` must **not** grant mechanical advantage—**flavor + orientation** only unless future missions gate on `read` flags (out of scope for M1).

---

## Block 3 (1.0h) — Mail authorship (sample **m1**)

Three threads, **three voices**:

1. **OPS-GR-001** — Handler **Sable**: warm, imperative, rules of engagement.
2. **LEG-ALR-992** — Helix: cold, legalistic, retention—**contrast** with ops.
3. **INT-ORI-14** — Orion internal: unofficial, routing hint—**teaches graph** without replacing `map`.

**Acceptance:** Each body **< 120 words** per thread; subjects **scannable** in `mail` list.

---

## Block 4 (1.0h) — UX acceptance (browser)

| Check | Pass criteria |
|-------|---------------|
| `mail` list | Unread marked **NEW**; read marked **READ** |
| `mail read` | Long bodies page in **boxPaged** |
| `clear` | Mail state persists in Node save (serialize) |
| Sound | Web: **Sound on** respects **mail** (no new sound required for MVP) |

---

## Block 5 (1.0h) — Audio design alignment (web)

- **Spinner** (probe/enum/exploit): distinct **loading** tones (throttled).
- **Stream** render: **bandpass noise + quiet sine** — “data buffer” not keyboard.
- **SOC:** alarm rise on **status** line (see engine audio hooks).

**GD intent:** avoid **fatigue** — throttle + short envelopes.

---

## Block 6 (1.0h) — Storybook / stylebook (design QA)

- Storybook = **visual regression** for chrome without running the game loop.
- Stylebook = **token** contract for any future skin (PIP vs plain).

**Designer tasks:**

- [ ] Confirm **ghost** hover matches **focus** visibility for keyboard users
- [ ] **ENTER** uses **↵** (icon) + **aria-label** (no redundant `title`)

---

## Block 7 (1.0h) — Difficulty & onboarding

- **m1** remains **tutorial-capable**; mail must not **spoil** exploit order.
- **INT-ORI-14** references topology **after** player has `scan`—still safe as **orientation** only.

**Future:** conditional `emails` unlock by `turns` or `discoveredNodes` — **not** in MVP.

---

## Block 8 (1.0h) — Review + handoff

- **STORY-BIBLE** updated with factions + mail hooks.
- **STYLEBOOK** documents tokens + components.
- **Open questions** for engineering:
  - Should E2E assert `mail` list? **Recommended** next sprint.
  - Should web persist mail read in **localStorage**? **Product call** — default **no**.

---

## Sign-off

Game design scope for **Bravo** captured; **8h** equivalent accounted for in systems, writing, UX acceptance, audio alignment, and handoff.
