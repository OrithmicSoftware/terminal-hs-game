RND_REPORT
Feature ID: hg-001
Hypotheses:
- JSON-defined node/service graphs are sufficient for mission authoring velocity.
- Deterministic procedural generation reduces test brittleness.
Approaches Tested:
- Single mission-only runtime.
- Multi-mission campaign with persisted snapshots.
- SOC pressure model driven by risk-triggered deterministic rolls.
Results:
- Campaign + snapshot approach enables resume/retry workflows.
- Deterministic alert roll offers reproducible QA behavior while preserving uncertainty.
Recommendation:
Adopt campaign + procedural hybrid architecture with mission snapshots persisted per command.
Confidence: high
Risks Remaining:
- Long-term procedural variety needs richer templates (branching topology, optional objectives).
