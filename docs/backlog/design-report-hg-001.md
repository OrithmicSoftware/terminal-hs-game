DESIGN_REPORT
Feature ID: hg-001
Core Loop:
Scan -> Pivot -> Enumerate -> Exploit -> Intel Read -> Exfil -> Submit.
Player Journey:
1) Parse mission brief and identify target node/file.
2) Expand discovered graph from foothold.
3) Manage trace and SOC alerts while chaining exploits.
4) Secure target artifact and submit objective.
5) Advance to next mission and repeat with escalating pressure.
Mechanics:
- Node graph with adjacency constraints.
- Service-specific exploit ids.
- Trace budget and SOC timed alerts.
- Counterplay commands: cover, spoof, laylow.
Content Requirements:
- 1 handcrafted tutorial/anchor mission.
- 4+ procedural missions with consistent schema.
- Distinct node IDs, exploit IDs, and target files per mission.
Telemetry Hooks:
- mission result (success/fail/abort)
- turns to completion
- trace at completion
- SOC alert count
Open Design Risks:
- Too many command aliases may reduce readability.
- SOC escalation pacing may feel punitive if triggered too often.
