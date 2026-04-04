# Terminal HS Game

[![CI](https://github.com/OrithmicSoftware/terminal-hs-game/actions/workflows/ci.yml/badge.svg)](https://github.com/OrithmicSoftware/terminal-hs-game/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

**Alpha `v0.1.0-alpha.1`** — breaking changes and bugs are expected; [open an issue](https://github.com/OrithmicSoftware/terminal-hs-game/issues).

Safe, fictional hacking simulation for terminal gameplay. Published by [Orithmic Software](https://github.com/OrithmicSoftware).

| | |
|---|---|
| **Repository** | https://github.com/OrithmicSoftware/terminal-hs-game |
| **License** | MIT |
| **CLI** | Node 18+, `node game.mjs` |
| **Browser** | `npm run web:dev` in this repo (Vite) |

## Run (CLI)

```powershell
node game.mjs
```

Or: `npm start` (Node 18+).

## Run (browser alpha)

```powershell
npm run web:dev
```

Then open the URL Vite prints (default port from `web/vite.config.js`). E2E: `npm run test:e2e` from repo root (builds `web/`, runs Playwright against preview).

## Alpha release

Git tag **`v0.1.0-alpha.1`** matches `package.json` version `0.1.0-alpha.1`. After pushing to GitHub, open **Releases → Draft a new release**, choose that tag, mark **Set as a pre-release**, and publish.

## Campaign features

- 1 handcrafted mission + 5 procedural missions
- campaign save/load with in-mission snapshots (`campaign-save.json`)
- SOC alert events with mitigation commands (`spoof`, `laylow`)
- trace-based fail state and retry support

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

- `campaign` - show mission board and status
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
