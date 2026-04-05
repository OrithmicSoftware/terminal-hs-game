/** Match game.mjs `shouldClearScreen` / `main.js` `shouldClearMissionWeb`: clear before known commands. */
export function shouldClearMissionWeb(line) {
  const t = line.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  const campaignExact = new Set([
    "ui pip",
    "ui plain",
    "typing on",
    "typing off",
    "beep on",
    "beep off",
    "reset",
    "tutorial",
    "tutorial on",
    "tutorial off",
    "quit",
    "campaign",
    "retry",
  ]);
  if (campaignExact.has(lower)) return true;
  const [a] = lower.split(/\s+/);
  /* Match game.mjs: info owns pager + pause steps; no pre-command clear. */
  if (a === "info") return false;
  const mission = new Set([
    "help",
    "clear",
    "status",
    "map",
    "scan",
    "probe",
    "connect",
    "enum",
    "exploit",
    "info",
    "stash",
    "ls",
    "cat",
    "exfil",
    "cover",
    "spoof",
    "laylow",
    "sql",
    "mail",
    "sendmail",
    "compose",
    "chat",
    "/brief",
    "submit",
    "tutorial",
    "quit",
  ]);
  return mission.has(a);
}
