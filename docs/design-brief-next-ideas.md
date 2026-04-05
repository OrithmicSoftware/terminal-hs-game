# Design brief — feed the backlog (rolling)

**Game designers / narrative:** add bullets here each sprint. Engineering will pick at least one item per iteration and implement or spike.

## Ideas pool (add yours)

- [ ] **Timed SOC escalation** — optional “hard” mode: alerts tick down faster unless spoofed in N turns.
- [ ] **Decoy traffic** — one command spends trace to lower next SOC roll (risk/reward).
- [ ] **Dual-path objectives** — exfil A *or* plant B payload; different debrief text.
- [ ] **Operator codename** — persist player handle in save; inject into banner/debrief.
- [ ] **Noise budget tutorial** — inline meter preview before first exploit.
- [ ] **Locale-specific intel** — RU/EN file variants for cat/stash strings.
- [x] **Postgres `COPY` mini-scene** — one-line fiction after successful `exploit misconfig-copy` (sim banner; no PROGRAM).
- [x] **Browser parity** — full campaign in browser (m1 fetch + same procedural missions as Node); `hktm_campaign_save` in `localStorage` (2026-04).

**Designers:** keep adding 3+ hooks per sprint — we will keep pulling the top P1 into the next engineering slice.

## Implemented from this list (append when done)

- **2026-04-02:** SQL bridge intel file on `app-api` + `sql` / `sql translate` / `sql demo` commands + `info sql-injection`.
- **2026-04-02:** SSH host-key theater before connect progress bar (auto-“yes” fiction).
- **2026-04-02:** Browser alpha (`web/`) — ANSI → HTML, Web Audio beep, exploit success uses `notifyBell()` (Node: BEL / Win beep path unchanged).
- **2026-04-02:** Mid-boot **second QA stderr** after banner Enter (`HKTM_QA`); `notifyBell()` on exploit success.
- **2026-04-02:** `misconfig-copy` exploit prints a short COPY-themed sim line (read-only fiction).

## Prompt for designers

Reply in PR or edit this file with **3+ new hooks** (mechanics, fiction, or UX). Tag priority: `P0` / `P1` / `P2`.
