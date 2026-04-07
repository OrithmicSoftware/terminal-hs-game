/**
 * Mini game puzzle data for `cipher`, `crack`, and `patch` commands.
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

/** Total number of rounds per mini game. */
export const MINI_GAME_ROUNDS = 3;
