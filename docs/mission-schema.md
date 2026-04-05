# Mission JSON Schema (Authoring Guide)

Every mission file lives in `missions/*.json`.

## Top-level fields

- `id` (string): unique mission id
- `title` (string): mission title
- `brief` (string): intro text
- `story` (object, optional): narrative wrapper
  - `handler.name` (string)
  - `time` (string)
  - `region` (string)
  - `debrief.success` (string)
  - `debrief.fail` (string)
- `connectGates` (array, optional): block `connect` along an edge until a prerequisite exploit completes
  - items: `{ "from", "to", "afterExploit": { "node", "exploitId" } }` — gate is satisfied when `exploit <exploitId>` succeeds on `node` (tracked in save state)
  - Example: `local → gw-edge` may require staging `weak-ssh` on `local`; `gw-edge → app-api` may require owning the gateway first (`exploit weak-ssh` on `gw-edge`) before pivoting to the app tier
- `tutorial` (object, optional): guided steps for new players
  - `steps[]` items with: `when`, `title`, `text`, `suggest` (+ optional `nodeId`/`path`/`gate`)
  - `when` values include: `discover_gw`, `enum_here`, `enum_on_node`, `gate_met`, `not_on_node`, `own_node`, `exfil`, `submit`
- `startNode` (string): initial node id (usually `local`)
- `security.maxTrace` (number): fail threshold
- `objective.summary` (string): displayed objective
- `objective.requiredNode` (string): must be owned before submit
- `objective.exfilFiles` (string[]): required file paths
- `edges` (`[from, to][]`): network links
- `nodes` (array): node definitions

## Node fields

- `id` (string): node id
- `services` (array):
  - `name` (string)
  - `port` (number)
  - `protocol` (string, optional): default `tcp` (also `udp` for display)
  - `exploitId` (string): command value for `exploit <id>`
  - `noise` (number): trace increase on exploit
  - `vulnRef` (string, optional): human-readable **CVE-style or weakness-class label** shown on **`enum`** (on-host); probe shows ports only (educational; not exploit instructions)
  - `vulnerability` (string, optional): alias for `vulnRef` if you prefer the longer key
  - `requiresArtifacts` (string[], optional): required in-game credential artifacts to run this exploit
  - `stagingOnly` (boolean, optional): if true, exploit is allowed on an **already-owned** start node to unlock gated hops (e.g. staging SSH before `connect`); does not re-flag the node as newly owned
- `noise.enum` (number): trace increase on `enum`
- `files` (array):
  - `path` (string)
  - `content` (string)
  - `artifact` (object, optional): grants a credential artifact when the player reads the file
    - `id` (string)
    - `description` (string)

## Command DSL used by engine

- `scan`: list neighbors from footholds + current node (no arguments); then `probe <id>` for a remote sweep
- `probe <host>`: discover host (if reachable) + **remote** port sweep — open ports and rough listener guesses **only** (no CVE writeups, no exploit ids on purpose)
- `connect <node>`: pivot session to a discovered adjacent node (subject to `connectGates`)
- `enum`: **on-host** enumeration on **current** node — maps ports to CVE-class text **and** `exploit <id>` (after you have connected; not a duplicate of probe)
- `exploit <id>`: run the staged exploit for a service enum showed; can own the host, unlock gated connects (`stagingOnly`), or depend on `requiresArtifacts` / file intel for alternate paths
- `stash`: list collected artifacts
- `ls`, `cat <path>`, `exfil <path>`: file intel loop
- `rsync <node>:<path> [local-path]`: pull a remote directory tree onto local node (noise 3; files become accessible via `ls`/`cat`/`grep`)
- `grep <pattern> [path]`: search files on current node for matching lines (no trace cost — local operation)
- `sqli <endpoint> <payload>`: test SQL injection surface; shows safe vs. injected query side by side (noise 1–5)
- `ssh-keyscan <host>`: show simulated SSH host-key fingerprint table (noise 1; educational: verify before connecting)
- `cover`: reduce trace
- `submit`: validates objective

## Handcrafted missions

| File | ID | Title | Nodes | Trace cap | Key mechanic |
|------|-----|-------|-------|-----------|-------------|
| `m1-ghost-proxy.json` | `m1-ghost-proxy` | Operation Ghost Proxy | local → gw-edge → app-api → db-core | 42 | Spear-phishing lure designer |
| `m2-datafall.json` | `m2-datafall` | Operation Datafall | local → corp-jump → file-share | 32 | rsync + grep for secret discovery |
| `m3-dark-channel.json` | `m3-dark-channel` | Operation Dark Channel | local → nexus-bastion → corp-internal | 36 | SSH key-based auth exploit |
| `m4-blind-query.json` | `m4-blind-query` | Operation Blind Query | local → api-internal → db-internal | 40 | SQL injection attack chain |

## Balance tips

- Keep `maxTrace` around 25-40.
- First node exploit should be cheap (noise 3-5).
- Final node exploit should be risky (noise 5-8).
- Required exfil file should be only on final objective node.
