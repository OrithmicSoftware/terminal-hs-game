# Exit / boot QA — two-pass cycles (required every iteration)

Premature return to the shell after **Press Enter to continue…** (before `>`) is a **P0**. Each engineering iteration must run **two full QA cycles** before merge or release.

## Environment

```powershell
$env:HKTM_QA = "1"
node game.mjs
# complete boot, confirm `>` appears, quit normally

$env:HKTM_QA = "2"
node game.mjs
# repeat cold start from the same terminal profile
```

## Cycle A (`HKTM_QA=1`)

1. Read stderr: first QA banner at startup.
2. Clear both Enter prompts (banner → splash).
3. After the **first** Enter (banner), read stderr: **second warning** (“splash loading next…”) before splash draws.
4. Confirm campaign board + map + status + `>` without dropping to `PS`.
5. Read stderr: “Pass 1 complete…” after `>`.

## Cycle B (`HKTM_QA=2`)

1. Read stderr: **second** QA banner (explicit pass 2/2).
2. Repeat steps 2–5 from cycle A (including mid-boot second warning).
3. Read stderr: “Pass 2 complete…”
4. If `beforeExit` fires unexpectedly, capture full transcript and attach to ticket.

## Sign-off

- [ ] Cycle A done on target OS/terminal (e.g. Windows PowerShell + Cursor integrated terminal).
- [ ] Cycle B done on same environment.
- [ ] Optional: `HKTM_QA=1` on second machine profile.

If either cycle fails, file a bug with terminal name, Node version, and whether stdin is piped.
