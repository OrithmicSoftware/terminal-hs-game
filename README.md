<img src="web/public/favicon.svg" width="88" height="88" alt="HKTM terminal mark" align="right" />

# Terminal HS Game

[![CI](https://github.com/OrithmicSoftware/terminal-hs-game/actions/workflows/ci.yml/badge.svg)](https://github.com/OrithmicSoftware/terminal-hs-game/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

**Alpha `v0.1.0-alpha.1`** — breaking changes and bugs are expected; [open an issue](https://github.com/OrithmicSoftware/terminal-hs-game/issues).

Safe, educational hacking simulation for terminal gameplay. Published by [Orithmic Software](https://github.com/OrithmicSoftware).

| | |
|---|---|
| **Repository** | https://github.com/OrithmicSoftware/terminal-hs-game |
| **License** | MIT |
| **CLI** | Node 18+, `node game.mjs` — **primary** gameplay surface |
| **Browser** | `npm run web:dev` (Vite shell; same missions, different UX) |

```text
╔════════════════════════════════════════════════════════════╗
║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
║▓▒░                                                    ░▒▓  ║
║▓▒░  ████████╗ █████╗  ██████╗██╗  ██╗███████╗███╗   ██╗ ░▒▓║
║▓▒░  ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗  ██║ ░▒▓║
║▓▒░     ██║   ███████║██║     █████╔╝ █████╗  ██╔██╗ ██║ ░▒▓║
║▓▒░     ██║   ██╔══██║██║     ██╔═██╗ ██╔══╝  ██║╚██╗██║ ░▒▓║
║▓▒░     ██║   ██║  ██║╚██████╗██║  ██╗███████╗██║ ╚████║ ░▒▓║
║▓▒░     ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ░▒▓║
║▓▒░                                                    ░▒▓  ║
║▓▒░  ███████╗██╗  ██╗███████╗███╗   ███╗██╗███╗   ███╗ ░▒▓  ║
║▓▒░  ██╔════╝██║  ██║██╔════╝████╗ ████║██║████╗ ████║ ░▒▓  ║
║▓▒░  ███████╗███████║█████╗  ██╔████╔██║██║██╔████╔██║ ░▒▓  ║
║▓▒░  ╚════██║██╔══██║██╔══╝  ██║╚██╔╝██║██║██║╚██╔╝██║ ░▒▓  ║
║▓▒░  ███████║██║  ██║███████╗██║ ╚═╝ ██║██║██║ ╚═╝ ██║ ░▒▓  ║
║▓▒░  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝╚═╝     ╚═╝ ░▒▓  ║
║▓▒░                                                    ░▒▓  ║
║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
╚════════════════════════════════════════════════════════════╝
  ░ grey-market penetration · trace ░
```

## Run (CLI) — start here

```powershell
node game.mjs
```

Or: `npm start` / `npm run game` (Node 18+).

**Fresh campaign every time** (deletes `campaign-save.json` in the repo root, then starts the game):

```powershell
npm run game:clear
```

Same as `npm run start:clear`. In-game `reset` also clears progress and re-runs the full CLI boot (loading lines → region/codename if needed → ShadowNet IM gate on mission 1 → mission banner → Enter → settings pager).

**First launch** mirrors the browser flow: kernel-style boot lines, branding + Enter, then interactive region (1–6) and codename (saved in `campaign-save.json`). Non-interactive stdin (piped/CI) picks `PAC-RIM` and `HKTM_CODENAME` / `USER` / `operator`. Skip long boot lines: `HKTM_SKIP_TERM_BOOT=1`. Skip the IM gate: `HKTM_SKIP_CHAT_GATE=1`.

## Run (browser alpha)

```powershell
npm run web:dev
```

**Fresh dev load** (clears browser `localStorage` / `sessionStorage` for this origin): `npm run web:dev:clear` (alias: `npm run clear`).

Then open the URL Vite prints (default port from `web/vite.config.js`). **Tests:** `npm test` (campaign state, mail snapshot, and **terminal e2e parity** with Playwright scenarios via `HKTM_E2E=1`); `npm run test:e2e` (builds `web/`, Playwright against preview). **Storybook:** `npm run storybook --prefix web`.

**UI lab:** `npm run storybook --prefix web` (component stories + `theme.css`). **Docs:** [docs/README.md](docs/README.md) (story bible, stylebook, PM/GD sprint notes).

## Preview deploy URLs (GitHub Pages)

- `main` / `master` deploy to: `https://orithmicsoftware.github.io/terminal-hs-game/`
- Other branches deploy to: `https://orithmicsoftware.github.io/terminal-hs-game/staging/<branch-slug>/`
- The branch slug is generated from the branch name by lowercasing it, replacing non-alphanumeric runs with `-`, and trimming leading/trailing `-`.
- If a branch name collapses to empty after normalization, the workflow falls back to `preview-<short-sha>`.
- Example: `feature/new-ui` -> `https://orithmicsoftware.github.io/terminal-hs-game/staging/feature-new-ui/`

## Alpha release

Git tag **`v0.1.0-alpha.1`** matches `package.json` version `0.1.0-alpha.1`. After pushing to GitHub, open **Releases → Draft a new release**, choose that tag, mark **Set as a pre-release**, and publish.

## Story

You are a **contract operator** — one slot in a queue, not the main character of the internet. Missions arrive through **ShadowNet IM**, a fictional secure-messaging channel where your handler **Sable** drops briefs, a childhood friend **Amanda** checks in, and **ORION·INT** compliance feeds warn you when SOC pressure spikes. The first operation, *Ghost Proxy*, stages a spear-phishing harvest against the Orion Logistics staging network; procedural contracts follow, each with randomised infrastructure and fresh CVE classes.

Every action raises **trace** — a detection meter modelling real SOC pressure. Push too hard without cover and the defenders burn your session. The game's tone is cold-thriller procedural: handlers speak through ops briefs and legal boilerplate, not tutorials.

For the full narrative reference see [`docs/STORY-BIBLE.md`](docs/STORY-BIBLE.md).

## What you'll learn

The campaign teaches **practical cybersecurity fundamentals** by making you use them:

| Concept | In-game mechanic |
|---------|-----------------|
| **SSH & credential reuse** | `exploit weak-ssh`, lateral pivot with stolen keys (CVE-2024-6387 family) |
| **Template injection / SSTI** | `exploit template-rce` on web services (CVE-2022-26134 class) |
| **Database misconfiguration** | `exploit misconfig-copy` via PostgreSQL COPY FROM PROGRAM (CVE-2019-9193) |
| **Phishing & social engineering** | Mission 1 stages a lure page to harvest a corporate password |
| **SQL injection** | `sql demo` / `sql translate` — interactive visualisation (no real DB) |
| **Operational security** | Trace budget, SOC alerts, `cover` / `spoof` / `laylow` trade-offs |
| **Network reconnaissance** | `scan`, `probe`, `enum` — port sweeps and service discovery |

Type `info <term>` in-game for a built-in glossary (e.g. `info ssh`, `info trace`, `info template-rce`).

## Campaign features

- 1 handcrafted mission + 5 procedural missions
- campaign save/load with in-mission snapshots (`campaign-save.json`)
- SOC alert events with mitigation commands (`spoof`, `laylow`)
- trace-based fail state and retry support
- mission inbox (`mail` / `mail read <id>`) when `emails[]` is present in mission JSON
- credential artifacts and multi-step lateral movement (`stash`)
- in-game glossary with real CVE references (`info <term>`)
- browser build: same campaign as Node (m1 + procedural missions); progress in `localStorage` key `hktm_campaign_save`
- browser shell: splash + sector/codename setup, contract chat (`chat`), disconnect screen on `quit`

## Campaign commands

Story runs **step by step**: the current mission is named in the terminal footer; the **contract channel** (chat drawer / `chat`) carries the brief. There is no mission list board. Type `help` for the full command reference or `tutorial` for guided first steps.
- `retry` - restart current mission after failure
- `quit` - save and close campaign

## Authoring new missions

See `docs/mission-schema.md`.

## AI team backlog

Ready-to-run role artifacts are in `docs/backlog/`:

- feature ticket
- PM report
- design report
- RnD report
- QA plan/report
