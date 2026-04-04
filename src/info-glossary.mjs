/**
 * Entries for `info <term>` — every mission command plus security/education terms.
 * `about`: general meaning; `exploit`: in-game behavior (second column; name kept for compatibility).
 */
export const INFO_GLOSSARY = {
  help: {
    about:
      "Help shows the command reference: what you can type in the mission shell and how paging works on long output.",
    exploit:
      "In this game: run help with no arguments to print the command list (paged if the terminal is short). Same information as this glossary entry, but interactive.",
  },
  clear: {
    about:
      "Clear traditionally wipes the visible screen so you can focus on the next output. In terminal UIs it often redraws the header or banner.",
    exploit:
      "In this game: clear clears the display and reprints the mission banner so you get a clean view without scrolling back.",
  },
  status: {
    about:
      "Status summarizes operational state: where you are, how much time has passed, detection pressure, and objective progress.",
    exploit:
      "In this game: status prints node, turns, trace bar, owned hosts, exfil counts, and any active SOC alert with turns remaining.",
  },
  map: {
    about:
      "A network map shows nodes and links—like a graph of hosts and how they connect.",
    exploit:
      "In this game: map lists only discovered nodes and edges between them, with owned vs unknown and your current position.",
  },
  scan: {
    about:
      "Host discovery finds systems you can reach from a foothold before you invest in deeper probing.",
    exploit:
      "In this game: run scan with no arguments to list neighbors from your footholds and current node. It does not sweep ports — use probe for a remote port table.",
  },
  probe: {
    about:
      "A remote port sweep finds open listeners from outside the target — before you have a shell or credentials on that box.",
    exploit:
      "In this game: probe <host> discovers the host (if reachable), adds trace, and prints open ports plus rough listener guesses. It deliberately does not show CVE writeups or exploit ids; after connect, enum maps ports to exploit <id> and weakness classes.",
  },
  connect: {
    about:
      "Connecting is moving your session to another machine—here abstracted as pivoting along the mission graph.",
    exploit:
      "In this game: connect <node> moves you to a discovered node along an edge (often after a staged link animation). Some missions add connectGates: you must complete a prerequisite exploit on a given node before a hop (e.g. staging SSH on local before connect gw-edge).",
  },
  enum: {
    about:
      "On-host enumeration maps what is listening to concrete weakness classes and exploit handles — only credible once you have a session on that system.",
    exploit:
      "In this game: enum on your current node (after connect) lists ports, CVE-class labels, and exploit ids you can pass to exploit <id>. Remote probe does not show those ids. Results are cached; enum -f / --force re-runs for trace cost.",
  },
  exploit: {
    about:
      "Exploitation is abusing a vulnerability class to gain access. This game never runs real exploits—only state changes and trace.",
    exploit:
      "In this game: exploit <id> runs the matching service on the current node after enum revealed that id. Outcomes can include owning the host, unlocking a gated connect (staging), or progressing via artifacts (cat files → stash) or chained intel (e.g. SQL injection notes → credentials for another service). Trace follows mission noise rules.",
  },
  info: {
    about:
      "This command is an in-fiction glossary: short explanations of commands and concepts so you do not need external docs.",
    exploit:
      "In this game: type info <term> to open a paged article. Terms include every command name plus concepts like trace, SOC, and CVE.",
  },
  sql: {
    about:
      "SQL is the database query language. Unsafe string building is a common source of injection bugs.",
    exploit:
      "In this game: sql with no args shows the SQL lab help; sql demo illustrates injection shape; sql translate \"…\" prints a fictional ssh/psql mapping—no database runs.",
  },
  stash: {
    about:
      "A stash is where recovered credential material is tracked between steps.",
    exploit:
      "In this game: stash lists fictional credential artifacts you picked up from intel files. Some exploits may require a specific artifact id.",
  },
  ls: {
    about:
      "Listing a directory shows file names on a system you can access.",
    exploit:
      "In this game: ls lists files on the current node only if you own it. Paths matter for cat and exfil.",
  },
  cat: {
    about:
      "Reading a file reveals content—often intel, configs, or story text in a simulation.",
    exploit:
      "In this game: cat <path> reads a file on the owned current node, may grant artifacts, and adds a small trace cost.",
  },
  exfil: {
    about:
      "Exfiltration is copying sensitive data out to attacker-controlled storage—usually noisy and monitored.",
    exploit:
      "In this game: exfil <path> marks an objective file as exfiltrated and raises trace. Use for required paths before submit.",
  },
  cover: {
    about:
      "Cover actions reduce observable noise—log cleanup, timing, or misdirection in fiction.",
    exploit:
      "In this game: cover lowers trace by a fixed amount. It does not cancel SOC countdowns; use spoof or laylow for alerts.",
  },
  spoof: {
    about:
      "Spoofing defenders means feeding false telemetry or clearing a false positive so analysts stand down.",
    exploit:
      "In this game: spoof clears an active SOC alert and slightly reduces trace. It only works while an alert is active.",
  },
  laylow: {
    about:
      "Going quiet reduces activity so sensors cool off—radio silence and patience.",
    exploit:
      "In this game: laylow spends the turn to reduce trace and can nudge SOC timer; it is weaker than spoof for alerts but helps when you are not mid-alert.",
  },
  tutorial: {
    about:
      "A tutorial surfaces the next suggested step for new players based on mission progress.",
    exploit:
      "In this game: tutorial prints the next tutorial step from mission JSON if one matches your state (discover, enum, own, exfil, etc.).",
  },
  submit: {
    about:
      "Submitting is declaring the objective complete so the mission can grade you.",
    exploit:
      "In this game: submit checks required node ownership and exfil paths; on success it finishes the mission and may show a debrief.",
  },
  quit: {
    about:
      "Quit ends the current session and returns control to the campaign shell or OS.",
    exploit:
      "In this game: quit marks the session aborted in campaign mode; in the browser demo it closes the fictional campaign session message.",
  },
  ssh: {
    about:
      "SSH (Secure Shell) is a protocol for encrypted remote login/command access to a machine. In this game, an 'ssh' service means a remote admin entry point exists.",
    exploit:
      "Exploitation (example): attackers probe for weak credentials, leaked keys, or misconfigured trust—then reuse a foothold to pivot. Here you simulate that by choosing the matching exploit id after enum; success grants shell-style access (owned) and raises trace like a noisy login or key reuse would.",
  },
  http: {
    about:
      "HTTP is the standard web protocol. An HTTP service often exposes an application/API surface, which may contain bugs or misconfigurations.",
    exploit:
      "Exploitation (example): classic paths include template bugs, unsafe deserialization, or admin panels left exposed. In this game, an HTTP-linked exploit id is a stand-in for chaining to RCE or data access—higher noise often means a splashier attack surface.",
  },
  postgres: {
    about:
      "Postgres (PostgreSQL) is a database server. In games like this, databases often hold the objective data but are riskier to touch (higher trace).",
    exploit:
      "Exploitation (example): attackers abuse COPY/export features, weak roles, or SQL paths exposed through an app. Here, a postgres-style exploit is abstracted as a high-impact action—expect more trace than touching a static file.",
  },
  soc: {
    about:
      "SOC = Security Operations Center. Think: defenders monitoring logs/alerts. SOC events raise pressure and can add trace if you ignore them.",
    exploit:
      "Exploitation (example): repeated scans, loud exploits, or ignored alerts behave like tripping detections—use spoof or laylow to simulate cooling off before the fictional analysts escalate.",
  },
  trace: {
    about:
      "Trace is your detection meter. If it hits the max for the mission, the session is burned (fail). Reduce it with cover/laylow/spoof.",
    exploit:
      "Exploitation (example): every noisy action (probe, exploit, exfil) adds heat. Planning a route that minimizes redundant touches models 'living off the land' versus hammering every service.",
  },
  "weak-ssh": {
    about:
      "weak-ssh: shorthand for an SSH access weakness (e.g., weak passwords, reused credentials, leaked keys, or leftover maintenance accounts). Real-world hardening: prefer key-based auth (ed25519), disable password login where possible, require MFA for admin access, remove default/unused accounts, and restrict SSH to VPN/allowlisted IPs.",
    exploit:
      "Exploitation (example): reuse a recovered key or password from another node (artifact flow), then run exploit weak-ssh on the service—this mirrors lateral movement with stolen creds, not scanning random hosts.",
  },
  "template-rce": {
    about:
      "template-rce: shorthand for server-side template injection leading to RCE (remote code execution). In the real world, this can happen when user input is rendered in templates unsafely. Here it's a fictional exploit class.",
    exploit:
      "Exploitation (example): after enum shows template-rce, you deploy that exploit id on the node to flip it to owned—think of it as user-controlled template data executing server-side, abstracted as one command.",
  },
  rce: {
    about:
      "RCE (Remote Code Execution) means causing a remote system to run attacker-chosen code. In this game it's simulated as a state transition to 'owned'.",
    exploit:
      "Exploitation (example): any exploit id labeled rce or ending in an RCE class is resolved as 'run payload, get foothold'—no real shellcode; the game marks the node compromised and bumps trace to reflect impact.",
  },
  "misconfig-copy": {
    about:
      "misconfig-copy: shorthand for a database misconfiguration that allows an unsafe COPY/export style data access path. Here it's a fictional exploit class representing 'bad DB configuration'.",
    exploit:
      "Exploitation (example): you abuse the mis-set export path to read rows or files the app didn't intend—represented here as a single exploit step with elevated trace, then you pivot to exfil objectives.",
  },
  artifact: {
    about:
      "Credential artifacts are fictional puzzle items in this game. Reading certain intel files can grant an artifact, which may unlock alternate access paths defined by the mission JSON.",
    exploit:
      "Exploitation (example): cat the note that references a key, stash lists the artifact, and a service may require that artifact before exploit succeeds—modeling 'use leaked material from host A on host B' without real secrets.",
  },
  cve: {
    about:
      "CVE (Common Vulnerabilities and Exposures) is a public catalog of IDs for specific security issues (CVE-YYYY-NNNN+). It does not contain exploit code; it is a reference label used by vendors, scanners, and defenders.",
    exploit:
      "In this game, mission JSON may attach a CVE-style label to a port/service to hint at the weakness class. Your action is still the abstract exploit command—no real exploitation steps are performed or taught.",
  },
  "port-scan": {
    about:
      "A port scan lists open TCP/UDP ports and often service fingerprints—here abstracted as the probe command.",
    exploit:
      "In this game: use probe <host> for the port sweep table; connect and enum then map ports to exploit ids.",
  },
  "sql-injection": {
    about:
      "SQL injection happens when user-controlled text is pasted into a SQL command as code instead of as data. The fix is parameterized queries / prepared statements so the database never parses user input as SQL structure.",
    exploit:
      "In this game, use sql demo and sql translate \"…\" to see a fictional mapping from your op shell to ssh/psql strings. Compare the naive concat line to the bind/parameter pattern—no real queries run.",
  },
};
