/**
 * Mini game puzzle data for `cipher`, `crack`, `patch`, and `infiltrate` commands.
 * Pure data module — no UI imports. Used by engine.mjs for interactive challenges.
 */

/**
 * Cipher puzzles: hex-encoded strings that the player must decode.
 * Each puzzle shows a hex dump and asks the player to identify the plaintext.
 */
export const CIPHER_PUZZLES = [
  {
    id: "cipher-1",
    label: "Intercepted beacon — operator ident field",
    hex: "4f70657261746f724163636573734b657932303234",
    options: [
      { label: "OperatorAccessKey2024" },
      { label: "0p3r4t0rK3y_2024" },
      { label: "OPERATOR_ACCESS_2024" },
    ],
    correctIdx: 0,
    feedback:
      "Correct. Each hex pair maps to an ASCII code: 4f=O, 70=p, 65=e, 72=r, 61=a, … Decoding byte by byte: OperatorAccessKey2024.",
    rejectFeedback: [
      "Decode each byte: 4f=O, 70=p, 65=e, 72=r, 61=a, 74=t, 6f=o, 72=r … spells OperatorAccessKey2024, not a leet-speak variant.",
      "Close in idea but the literal ASCII decode of the hex is OperatorAccessKey2024 — uppercase is exact, no underscores.",
    ],
  },
  {
    id: "cipher-2",
    label: "Exfil channel tag — staging payload header",
    hex: "737461676564436f6e6e6563742e6f766c",
    options: [
      { label: "StagedConnect.ovl" },
      { label: "stagedConnect.ovl" },
      { label: "staged_connect.ovl" },
    ],
    correctIdx: 1,
    feedback:
      "Correct. 73=s (lowercase), 74=t, 61=a, 67=g, 65=e, 64=d — the first byte 73 is lowercase 's', not uppercase 'S'. Full decode: stagedConnect.ovl.",
    rejectFeedback: [
      "Check byte 0x73: that is decimal 115 = ASCII 's' (lowercase). The field starts with a lowercase 's', so 'StagedConnect.ovl' is wrong.",
      "The hex uses 73 (lowercase s), not an underscore. There is no underscore byte (5f) in the payload.",
    ],
  },
  {
    id: "cipher-3",
    label: "Pivot credential tag — gw-edge login hint",
    hex: "6777656467652d6d61696e74",
    options: [
      { label: "gwedge-maint" },
      { label: "gw-edge-maint" },
      { label: "gw_edge_maint" },
    ],
    correctIdx: 1,
    feedback:
      "Correct. 67=g, 77=w, 65=e, 64=d, 67=g, 65=e, 2d='-' (hyphen), 6d=m, 61=a, 69=i, 6e=n, 74=t. Decoded: gw-edge-maint.",
    rejectFeedback: [
      "There is a hyphen byte 0x2d in the payload after 'gw'. The full decode is gw-edge-maint, not gwedge-maint.",
      "Byte 0x2d is ASCII 45 = hyphen, not underscore (0x5f = 95). The decoded string uses hyphens: gw-edge-maint.",
    ],
  },
];

/**
 * Crack puzzles: simulated password hash cracking.
 * Each puzzle shows a truncated "hash" and 3 candidate passwords.
 * The correct answer is identified by the puzzle's correctIdx.
 * The displayed hash is flavor text to reinforce the educational scenario;
 * no real hashing is performed.
 */

export const CRACK_PUZZLES = [
  {
    id: "crack-1",
    label: "gw-edge service account",
    hashPrefix: "$sim2b$12$",
    hashSuffix: "...AuTcNpXzK1",
    candidates: ["admin2024", "gwedge_ops", "r00tme!"],
    correctIdx: 1,
    feedback:
      "Correct. Dictionary cracking works by hashing every word in a wordlist and comparing. 'gwedge_ops' matched the stored hash. Takeaway: avoid predictable patterns like service-name + role.",
    rejectFeedback: [
      "The hash does not match 'admin2024'. That is in every wordlist — a real defender would have locked it immediately. The match is 'gwedge_ops'.",
      "The hash does not match 'r00tme!'. Leet-speak substitutions are included in modern wordlists too. The correct match is 'gwedge_ops'.",
    ],
  },
  {
    id: "crack-2",
    label: "db-core maintenance role",
    hashPrefix: "$sim2b$12$",
    hashSuffix: "...Rm7vQpLsX9",
    candidates: ["dbadmin", "P@ssw0rd!", "db_maint_q4"],
    correctIdx: 2,
    feedback:
      "Correct. 'db_maint_q4' was in the wordlist because it follows an obvious naming convention. Predictable seasonal or role-based passwords (e.g. _q4, _2024) are prioritized in targeted attacks.",
    rejectFeedback: [
      "The hash does not match 'dbadmin'. Very common — already cracked in prior engagement. The right answer is 'db_maint_q4'.",
      "The hash does not match 'P@ssw0rd!'. Common substitution pattern. The correct match is 'db_maint_q4', a targeted wordlist entry.",
    ],
  },
  {
    id: "crack-3",
    label: "app-api deployment token",
    hashPrefix: "$sim2b$12$",
    hashSuffix: "...Nk3wJhBpV5",
    candidates: ["deploy_token_staging", "staging2024!", "token_abc123"],
    correctIdx: 0,
    feedback:
      "Correct. 'deploy_token_staging' was recovered. Long passwords are stronger, but predictable structure (role + environment) still ends up in wordlists. Use a random token generator for deploy secrets.",
    rejectFeedback: [
      "The hash does not match 'staging2024!'. Season + year passwords are in every targeted wordlist. The correct match is 'deploy_token_staging'.",
      "The hash does not match 'token_abc123'. Sequential suffixes are a known pattern. The correct match is 'deploy_token_staging'.",
    ],
  },
];

/**
 * Patch puzzles: code vulnerability remediation challenges.
 * Each puzzle shows a vulnerable code snippet and 3 fix options.
 * Only one fix correctly addresses the vulnerability.
 */
export const PATCH_PUZZLES = [
  {
    id: "patch-1",
    vuln: "SQL Injection — string concatenation in query",
    code: [
      "// Ticket search endpoint (Node.js/Express)",
      "app.get('/search', async (req, res) => {",
      "  const q = \"SELECT * FROM tickets WHERE title='\" + req.query.title + \"'\";",
      "  const rows = await db.query(q);",
      "  res.json(rows);",
      "});",
    ],
    options: [
      {
        label: "Wrap req.query.title in encodeURIComponent() before inserting into the query string",
        fix: [
          "  const q = \"SELECT * FROM tickets WHERE title='\" + encodeURIComponent(req.query.title) + \"'\";",
        ],
      },
      {
        label: "Use a parameterized query: db.query('SELECT * FROM tickets WHERE title = $1', [req.query.title])",
        fix: [
          "  const rows = await db.query('SELECT * FROM tickets WHERE title = $1', [req.query.title]);",
        ],
      },
      {
        label: "Limit the input length: if (req.query.title.length > 50) return res.status(400).send('too long')",
        fix: [
          "  if (req.query.title.length > 50) return res.status(400).send('too long');",
          "  const q = \"SELECT * FROM tickets WHERE title='\" + req.query.title + \"'\";",
        ],
      },
    ],
    correctIdx: 1,
    feedback:
      "Correct. Parameterized queries (prepared statements) separate SQL structure from user data — the driver never parses user input as SQL. encodeURIComponent handles URL encoding, not SQL; length limits reduce but do not eliminate injection risk.",
    rejectFeedback: [
      "encodeURIComponent() is for URL encoding, not SQL safety. An attacker can still inject with characters not escaped by that function (e.g. single quotes). Use parameterized queries.",
      "Length checks reduce surface but do not prevent short injections like ' OR 1=1--. The correct fix is parameterized queries so user input is never parsed as SQL structure.",
    ],
  },
  {
    id: "patch-2",
    vuln: "Reflected XSS — unsanitized user input in HTML response",
    code: [
      "// Search results page (Python/Flask)",
      "@app.route('/results')",
      "def results():",
      "    term = request.args.get('q', '')",
      "    html = f'<h2>Results for: {term}</h2>'",
      "    return render_template_string('<html><body>' + html + '</body></html>')",
    ],
    options: [
      {
        label: "Validate that 'term' only contains alphanumeric characters before inserting it",
        fix: [
          "    if not term.isalnum(): return 'Invalid input', 400",
        ],
      },
      {
        label: "Limit term to 200 characters: term = term[:200]",
        fix: [
          "    term = term[:200]",
        ],
      },
      {
        label: "HTML-escape 'term' using markupsafe.escape() before inserting into the template",
        fix: [
          "    from markupsafe import escape",
          "    term = escape(term)",
        ],
      },
    ],
    correctIdx: 2,
    feedback:
      "Correct. HTML-escaping converts < to &lt;, > to &gt;, etc., so browser never parses injected script tags as code. Alphanumeric-only validation is overly restrictive (breaks legitimate searches with spaces or dashes) and length limits do not prevent XSS.",
    rejectFeedback: [
      "Alphanumeric-only validation blocks many legitimate queries (spaces, hyphens, accented characters). It also does not fully eliminate XSS — a better approach is HTML escaping with markupsafe.escape().",
      "Length limits do not prevent XSS; a short payload like <script>fetch('…') </script> is well under 200 chars. Use HTML escaping (markupsafe.escape) to neutralize special characters.",
    ],
  },
  {
    id: "patch-3",
    vuln: "Path traversal — user-controlled file path",
    code: [
      "// File download endpoint (Go)",
      "func downloadHandler(w http.ResponseWriter, r *http.Request) {",
      "    filename := r.URL.Query().Get(\"file\")",
      "    data, err := os.ReadFile(\"/var/app/reports/\" + filename)",
      "    if err != nil { http.Error(w, \"not found\", 404); return }",
      "    w.Write(data)",
      "}",
    ],
    options: [
      {
        label: "Check that filename does not contain '..' before reading",
        fix: [
          "    if strings.Contains(filename, \"..\") { http.Error(w, \"forbidden\", 403); return }",
        ],
      },
      {
        label: "Resolve the full path and verify it stays within /var/app/reports/ using filepath.Clean and strings.HasPrefix",
        fix: [
          "    safe := filepath.Clean(\"/var/app/reports/\" + filename)",
          "    if !strings.HasPrefix(safe, \"/var/app/reports/\") { http.Error(w, \"forbidden\", 403); return }",
        ],
      },
      {
        label: "URL-decode the filename parameter before using it",
        fix: [
          "    filename, _ = url.QueryUnescape(filename)",
        ],
      },
    ],
    correctIdx: 1,
    feedback:
      "Correct. filepath.Clean resolves all . and .. references and symlink-independent canonical form, then HasPrefix confirms the result stays under the allowed directory. Blocking '..' strings alone is bypassable with encoded variants (%2e%2e) or other tricks.",
    rejectFeedback: [
      "Blocking '..' by string match is bypassable with URL-encoded variants (%2e%2e%2f) or null bytes on some platforms. Use filepath.Clean + HasPrefix to safely canonicalize the path.",
      "URL-decoding does not add safety — it makes things worse by converting encoded traversal sequences into literal '../' before passing them to ReadFile. Use filepath.Clean + HasPrefix.",
    ],
  },
];

/**
 * Infiltration puzzles: deterministic stealth-routing scenarios inspired by
 * turn-based path planning. Each step advances patrols after your move, so the
 * player must pick the safe route one turn at a time.
 */
export const INFILTRATE_PUZZLES = [
  {
    id: "infiltrate-1",
    title: "Relay Hall",
    objective: "Slip past the patrol, grab the relay key, and exit without crossing its lane.",
    steps: [
      {
        board: [
          "  P──A──K",
          "     │",
          "     B──E",
          "     ↑",
          "     G",
        ],
        patrol: "Guard patrol moves G → B after your turn.",
        prompt: "What's the clean opening move?",
        options: [
          { label: "Move to A" },
          { label: "Hold at P" },
          { label: "Drop to B" },
        ],
        correctIdx: 0,
        feedback:
          "Correct. Taking A now keeps one node between you and the patrol before it climbs into the middle lane.",
        rejectFeedback: [
          "Waiting lets the patrol step onto B and control the whole junction. In these puzzles, tempo matters as much as position.",
          "B is the node the guard is about to occupy. Stepping there walks directly into the patrol route.",
        ],
      },
      {
        board: [
          "  S──P──K",
          "     │",
          "     G──E",
          "",
          "Patrol next moves B → E after your turn.",
        ],
        patrol: "The center lane is hot for one turn; plan around the next patrol hop.",
        prompt: "How do you keep the route clean?",
        options: [
          { label: "Move back to S" },
          { label: "Take the key at K" },
          { label: "Drop onto G" },
        ],
        correctIdx: 1,
        feedback:
          "Correct. The guard is vacating the lower lane, so grabbing the key now keeps you ahead of the cycle instead of behind it.",
        rejectFeedback: [
          "Backing up gives away the rhythm advantage. You need the key before the patrol circles back across the choke point.",
          "The lower lane is still occupied this turn. Hitman GO-style puzzles punish moving into a node before the patrol finishes its step.",
        ],
      },
      {
        board: [
          "  S──A──P",
          "     │",
          "     B──G",
          "        │",
          "        E",
        ],
        patrol: "Guard moves E → lower dead-end after your turn.",
        prompt: "Finish the route.",
        options: [
          { label: "Hold at P" },
          { label: "Move to A" },
          { label: "Exit via E" },
        ],
        correctIdx: 2,
        feedback:
          "Correct. You cross the exit node exactly as the guard leaves it, which is the whole trick of deterministic stealth routing.",
        rejectFeedback: [
          "Holding wastes the opening. The guard loops back if you don't take the exit on the safe beat.",
          "Retreating to A resets the puzzle and gives the patrol time to reclaim the exit lane.",
        ],
      },
    ],
    completion: "Key lifted and route cleared. No alarm, no cleanup.",
  },
  {
    id: "infiltrate-2",
    title: "Switchback Bridge",
    objective: "Use a one-turn blind spot to cross a bridge watched from two angles.",
    steps: [
      {
        board: [
          "  P──A──B──E",
          "      │",
          "      K",
          "",
          "  G patrols B → A after your turn.",
        ],
        patrol: "The guard sweeps left one node each round.",
        prompt: "How do you start the cross?",
        options: [
          { label: "Move to A" },
          { label: "Sprint to B" },
          { label: "Wait at P" },
        ],
        correctIdx: 0,
        feedback:
          "Correct. You move into the space the patrol is leaving, setting up a safe handoff on the bridge.",
        rejectFeedback: [
          "B is still watched this turn. You only get that node after the patrol slides left.",
          "Waiting keeps you stuck on the near side while the patrol re-centers on the bridge.",
        ],
      },
      {
        board: [
          "  S──P──B──E",
          "      │",
          "      K",
          "",
          "  Guard now sits on A and will move A → P after your turn.",
        ],
        patrol: "You need the objective before the bridge closes.",
        prompt: "What's the winning second move?",
        options: [
          { label: "Take K" },
          { label: "Run back to S" },
          { label: "Force through B" },
        ],
        correctIdx: 0,
        feedback:
          "Correct. The side pocket is the blind spot; it lets you wait out the patrol without giving up bridge position.",
        rejectFeedback: [
          "Retreating resets your progress and leaves no path to the exit on the next safe beat.",
          "Forcing B now collides with the patrol's control line. The safe route uses the side pocket first.",
        ],
      },
      {
        board: [
          "  S──A──B──E",
          "      │",
          "      P",
          "",
          "  Guard shifts back onto P after your turn.",
        ],
        patrol: "The bridge is clear for exactly one move.",
        prompt: "Take the clean finish.",
        options: [
          { label: "Step to A" },
          { label: "Cross to B" },
          { label: "Hold in cover" },
        ],
        correctIdx: 1,
        feedback:
          "Correct. Crossing to B as the patrol drops into the pocket preserves spacing and opens the exit lane.",
        rejectFeedback: [
          "A is about to be covered again. You need to use the bridge window immediately.",
          "Holding in cover burns the only clean timing window on the bridge.",
        ],
      },
      {
        board: [
          "  S──A──P──E",
          "",
          "  Guard returns to center after your turn.",
        ],
        patrol: "You're one move ahead; stay that way.",
        prompt: "Exit before the patrol re-centers.",
        options: [
          { label: "Exit via E" },
          { label: "Backtrack to A" },
          { label: "Wait on P" },
        ],
        correctIdx: 0,
        feedback:
          "Correct. Once you're ahead of the patrol cycle, the right play is usually to leave before the board collapses again.",
        rejectFeedback: [
          "Backtracking hands the tempo back to the patrol and reopens the bridge problem.",
          "Waiting on the center node gets you caught when the patrol recenters.",
        ],
      },
    ],
    completion: "Bridge crossed. Patrol never got a second look.",
  },
  {
    id: "infiltrate-3",
    title: "Vault Triangle",
    objective: "Steal the vault token, bait the scanner off the exit, and leave on the recovery turn.",
    steps: [
      {
        board: [
          "      K",
          "     / \\",
          "    A   B",
          "     \\ /",
          "  P── C ──E",
          "      │",
          "      G",
        ],
        patrol: "Scanner moves G → C after your turn.",
        prompt: "Where do you go first?",
        options: [
          { label: "Advance to C" },
          { label: "Climb to A" },
          { label: "Hold at P" },
        ],
        correctIdx: 1,
        feedback:
          "Correct. Taking the upper lane avoids the scanner's predictable center sweep and gives you angle on the key.",
        rejectFeedback: [
          "C is the scanner's next stop. The center is only safe after you divert the patrol away from it.",
          "Holding leaves you with no route to the token before the scanner seals the center.",
        ],
      },
      {
        board: [
          "      K",
          "     / \\",
          "    P   B",
          "     \\ /",
          "  S── G ──E",
        ],
        patrol: "Scanner now occupies C and will move C → E after your turn.",
        prompt: "Exploit the patrol shift.",
        options: [
          { label: "Drop to C" },
          { label: "Take the token at K" },
          { label: "Retreat to S" },
        ],
        correctIdx: 1,
        feedback:
          "Correct. While the scanner commits to the exit lane, the token node is safe for exactly one turn.",
        rejectFeedback: [
          "Dropping to C lands on the scanner's current position. Wait for the patrol to leave the center first.",
          "Retreating gives up the only turn where both token and exit are potentially reachable.",
        ],
      },
      {
        board: [
          "      P",
          "     / \\",
          "    A   B",
          "     \\ /",
          "  S── C ──G",
          "          │",
          "          E",
        ],
        patrol: "Scanner moves E → lower stub after your turn.",
        prompt: "Set up the final escape.",
        options: [
          { label: "Shift to B" },
          { label: "Drop to C" },
          { label: "Exit via E" },
        ],
        correctIdx: 1,
        feedback:
          "Correct. You need the center node now so the exit is one clean step away when the scanner peels off.",
        rejectFeedback: [
          "B is safe, but it leaves you one beat too far from the exit when the window opens.",
          "E is still occupied. The safe route needs one staging move before extraction.",
        ],
      },
      {
        board: [
          "      K",
          "     / \\",
          "    A   B",
          "     \\ /",
          "  S── P ──E",
          "",
          "  Scanner steps off the exit after your turn.",
        ],
        patrol: "Last move. The scanner cannot recover in time if you leave now.",
        prompt: "Clean extraction?",
        options: [
          { label: "Exit via E" },
          { label: "Retreat to S" },
          { label: "Climb back to A" },
        ],
        correctIdx: 0,
        feedback:
          "Correct. The scanner vacates the lane, you step through, and the whole route resolves exactly like a good board puzzle should.",
        rejectFeedback: [
          "Retreating reopens the center and lets the scanner reclaim the exit lane.",
          "Going back upstairs gives away the extraction window you spent three turns creating.",
        ],
      },
    ],
    completion: "Vault token secured and exfil path burned behind you.",
  },
];

/** Total number of rounds per mini game. */
export const MINI_GAME_ROUNDS = 3;
