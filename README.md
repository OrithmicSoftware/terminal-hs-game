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

## Alpha release

Git tag **`v0.1.0-alpha.1`** matches `package.json` version `0.1.0-alpha.1`. After pushing to GitHub, open **Releases → Draft a new release**, choose that tag, mark **Set as a pre-release**, and publish.

## Campaign features

- 1 handcrafted mission + 5 procedural missions
- campaign save/load with in-mission snapshots (`campaign-save.json`)
- SOC alert events with mitigation commands (`spoof`, `laylow`)
- trace-based fail state and retry support
- mission inbox (`mail` / `mail read <id>`) when `emails[]` is present in mission JSON
- browser build: same campaign as Node (m1 + procedural missions); progress in `localStorage` key `hktm_campaign_save`
- browser shell: splash + sector/codename setup (`hktm_operator_profile`), Client chat (`chat` / header; same contract copy as terminal pager; pings on key beats), disconnect screen on `quit`

## Mission controls

```text
scan
probe gw-edge
enum
exploit weak-ssh
connect gw-edge
enum
exploit weak-ssh
probe app-api
connect app-api
enum
exploit template-rce
probe db-core
connect db-core
enum
exploit misconfig-copy
ls
cat /data/client_billing.csv
exfil /data/client_billing.csv
submit
```

## Campaign commands

Story runs **step by step**: the current mission is named in the terminal footer; the **contract channel** (chat drawer / `chat`) carries the brief. There is no mission list board.
- `retry` - restart current mission after failure
- `quit` - save and close campaign

## Glossary help

Use `info <term>` in-game. Examples:

- `info ssh`
- `info template-rce`
- `info trace`

## Authoring new missions

See `docs/mission-schema.md`.

## AI team backlog

Ready-to-run role artifacts are in `docs/backlog/`:

- feature ticket
- PM report
- design report
- RnD report
- QA plan/report
