# Exit / boot QA — two-pass cycles (required every iteration)

Premature return to the shell after **Press Enter to continue…** (before `>`) is a **P0**. Each engineering iteration must run **two full QA cycles** before merge or release.

**Handler refresh:** The previous verification lead was released after repeated misses on the early-exit regression. **Elliot** is the new lead — a **lonely father** raising his kid solo; he cannot afford another false “green” on boot. Treat stderr banners from `HKTM_QA` as his sign‑offs, not optional flavor.

## Why the game can look like it “just quits”

Node only stays alive while something is still scheduled (e.g. readline waiting on stdin). Common real causes:

- **Stdin closed / EOF** — piping into `node game.mjs`, a runner that closes stdin, or a terminal profile that ends input early will tear down readline and the process can exit right after boot.
- **Launched outside a persistent shell** — double‑clicking `game.mjs` or a shortcut can open a window that closes as soon as Node exits, which feels like an instant quit even when the game behaved normally.
- **Intended exit** — `quit`, campaign end paths, or **Ctrl+C** / **Ctrl+D** (EOF) end the session on purpose.

If Elliot’s cycles fail, capture **full stdout+stderr**, Node version, terminal name, and whether stdin is piped.

**Boot tip:** Do not tap **Enter** while the mission banner is still **typing**—with readline active, that key can be buffered and make the next “Press Enter to continue” step behave like an instant exit on some Windows / IDE terminals.

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
