# PM sprint record — “Bravo” (browser shell & narrative plumbing)

**Role:** Product manager (single owner).  
**Estimated effort logged:** **8.0h** (structured as one focused working day + buffer).  
**Sprint goal:** Ship **discoverable** UI documentation (Storybook + stylebook), **in-game mail** as a first-class mission channel, and **traceable** design intent for stakeholders.

---

## Hour block 1 (1.0h) — Discovery & alignment

- Reviewed existing **browser alpha** scope: Vite shell, engine `execute`, Playwright E2E, no React.
- Confirmed **non-goals:** no real email integration, no account system.
- Stakeholder narrative: *“Operators receive briefs like real red-team packages—mail is diegetic JSON.”*
- **Output:** problem statement + success metrics (below).

### Success metrics (alpha)

| Metric | Target |
|--------|--------|
| New player finds **mail** without reading source | `help` + one mission email visible in **m1** |
| UI regressions caught before merge | Storybook stories for chrome fragments |
| Support questions on “what color is the button” | Answered by **STYLEBOOK** |

---

## Hour block 2 (1.0h) — Storybook decision & AC

- **Decision:** `@storybook/html-vite` (matches stack; no React tax).
- **AC:**
  - [ ] `npm run storybook --prefix web` starts on **6006**
  - [ ] `npm run build-storybook --prefix web` emits static `web/storybook-static/`
  - [ ] Stories import **`theme.css`** via preview
  - [ ] Minimum stories: header actions, step toolbar, input row, ghost states
- **Risk:** Storybook + Vite 6 peer quirks → **mitigation:** pin `storybook@8.4.x`, ignore telemetry in CI notes.

---

## Hour block 3 (1.0h) — Mail feature PRD (MVP)

### Problem

Mission flavor lived only in **banner** and **files**. Operators need **short, scannable** comms that don’t require `cat` on a node.

### Solution (MVP)

- Mission JSON optional array: **`emails[]`**
- Commands: **`mail`** (list), **`mail read <id>`** (pager)
- **Persistence:** `mailState` in `serialize()` (Node campaign) — web demo: session-only unless expanded later

### Non-goals (MVP)

- SMTP, compose, reply, threading beyond **id**
- Push notifications / toasts

### Dependencies

- Engine `execute` switch + `help` + `info` glossary
- Web **clear screen** list includes **`mail`**

---

## Hour block 4 (1.0h) — Backlog & prioritization

| Priority | Item | Status |
|----------|------|--------|
| P0 | Engine `mail` + mission JSON sample | Done |
| P0 | Docs index + README pointers | Done |
| P1 | Storybook static build in `.gitignore` | Done |
| P2 | CI job for `build-storybook` | Future |
| P2 | E2E: `mail` lists ≥1 thread in **m1** | Future |

---

## Hour block 5 (1.0h) — Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mail content feels like legal advice | Medium | Fiction disclaimer in story bible; Helix copy is **in-universe** only |
| Pager + mail length | Low | Reuse `boxPaged` + `wrap` |
| Snapshot save size | Low | Only `id` + `read` flags |

---

## Hour block 6 (1.0h) — Stakeholder comms (internal)

- **Eng:** schema for `emails[]` documented in **STORY-BIBLE**
- **Design:** STYLEBOOK references Storybook
- **Narrative:** sample threads (ops / legal / intel) drafted for **m1** acceptance

---

## Hour block 7 (0.5h) — QA checklist (PM-owned)

- [ ] `help` shows **mail** line
- [ ] `info mail` returns glossary
- [ ] `mail` after boot lists **3** threads in **m1**
- [ ] `mail read OPS-GR-001` opens pager; re-list shows **READ**

---

## Hour block 8 (0.5h) — Retro & next sprint

- **What worked:** JSON-driven mail avoids UI sprawl.
- **Next:** Optional E2E for `mail`; CI storybook build; mission editor doc for writers.

---

## Sign-off

PM owner: **Sprint Bravo** scope documented; **8h** equivalent accounted for in planning, writing, risk, acceptance, and handoff.
