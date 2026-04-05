/**
 * Named `--checkpoint` entry points for `node game.mjs --checkpoint <id>`.
 * @type {ReadonlyArray<{ id: string, description: string }>}
 */
export const CHECKPOINTS = [
  {
    id: "splash",
    description:
      "Same as cold start but labels the first boot clear as checkpoint-splash (full intro, then mission shell).",
  },
  {
    id: "operator-survey",
    description:
      "Same boot flow with checkpoint-operator-survey on the first clear (splash → survey if needed → loading → shell).",
  },
  {
    id: "kernel-loading",
    description:
      "Skip splash; prefill operator profile; first clear is checkpoint-kernel-loading, then faux kernel loading (HKTM-UPLINK lines) like post-boot.",
  },
  {
    id: "chat-gate",
    description:
      "Mission 1 active: incoming ShadowNet IM hint only — type `chat` to open IM (`chatGatePending`).",
  },
  {
    id: "mission-shell",
    description: "Mission 1 banner + operation footer + `>`; chat gate skipped (normal mission commands).",
  },
  {
    id: "compose-mail-ready",
    description: "Fast path: banner + footer, then pause at “Preparation ready…” before compose animation.",
  },
  {
    id: "compose-mail",
    description: "Fast path: full compose-mail flow from lure picks through mission resolution.",
  },
  {
    id: "mission-complete-m1",
    description:
      "Mission 1 shell with state forced to success (finished) — use `next`, `chat`, or `info chat` as after a harvest.",
  },
];

/** @type {ReadonlySet<string>} */
export const CHECKPOINT_IDS = new Set(CHECKPOINTS.map((c) => c.id));

export function formatCheckpointListForCli() {
  const lines = CHECKPOINTS.map((c) => `  ${c.id.padEnd(22)} ${c.description}`);
  return ["Supported checkpoints:", ...lines].join("\n");
}
