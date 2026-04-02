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
- `tutorial` (object, optional): guided steps for new players
  - `steps[]` items with: `when`, `title`, `text`, `suggest` (+ optional `nodeId`/`path`)
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
  - `vulnRef` (string, optional): human-readable **CVE-style or weakness-class label** shown on `scan ports <host>` and `enum` (educational; not exploit instructions)
  - `vulnerability` (string, optional): alias for `vulnRef` if you prefer the longer key
  - `requiresArtifacts` (string[], optional): required in-game credential artifacts to run this exploit
- `noise.enum` (number): trace increase on `enum`
- `files` (array):
  - `path` (string)
  - `content` (string)
  - `artifact` (object, optional): grants a fictional credential artifact when the player reads the file
    - `id` (string)
    - `description` (string)

## Command DSL used by engine

- `scan`: list adjacent hosts to port-sweep
- `scan ports <host>` (alias: `scan <host>`): discover host + **port sweep** (open ports, protocol, CVE-class hints)
- `connect <node>`: move to owned adjacent node
- `enum`: reveal services/exploit ids on current node
- `exploit <id>`: compromise current node via service exploit id
- `stash`: list collected artifacts
- `ls`, `cat <path>`, `exfil <path>`: file intel loop
- `cover`: reduce trace
- `submit`: validates objective

## Balance tips

- Keep `maxTrace` around 25-40.
- First node exploit should be cheap (noise 3-5).
- Final node exploit should be risky (noise 5-8).
- Required exfil file should be only on final objective node.
