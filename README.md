# Hacker Terminal Game

**Alpha `v0.1.0-alpha.1`** — breaking changes and bugs are expected; open an issue on the repo.

Safe, fictional hacking simulation for terminal gameplay.

## Run

```powershell
node game.mjs
```

## Campaign Features

- 1 handcrafted mission + 5 procedural missions
- campaign save/load with in-mission snapshots (`campaign-save.json`)
- SOC alert events with mitigation commands (`spoof`, `laylow`)
- trace-based fail state and retry support

## Mission Controls

```text
scan gw-edge
connect gw-edge
enum
exploit weak-ssh
scan ports app-api
connect app-api
enum
exploit template-rce
scan ports db-core
connect db-core
enum
exploit misconfig-copy
ls
cat /data/client_billing.csv
exfil /data/client_billing.csv
submit
```

## Campaign Commands

- `campaign` - show mission board and status
- `retry` - restart current mission after failure
- `quit` - save and close campaign

## Glossary Help

Use `info <term>` in-game. Examples:

- `info ssh`
- `info template-rce`
- `info trace`

## Authoring New Missions

See `docs/mission-schema.md`.

## AI Team Backlog

Ready-to-run role artifacts are in `docs/backlog/`:

- feature ticket
- PM report
- design report
- RnD report
- QA plan/report
