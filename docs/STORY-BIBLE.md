# Story bible — Terminal HS Game (browser α)

**Status:** living document. **Audience:** writers, mission authors, VO (if any), localization.

## Premise

Players operate as **contract operators** in a near-future where **grey-hat penetration** is sold as insurance, compliance, and “ethical red team” theater. The **terminal is the truth surface**: maps, trace, SOC, and exfil are all legible in-shell—no cinematic HUD required.

## Tone

- **Cold-thriller frame (CLI + boot copy):** grids as rusted infrastructure, truth as something you **dig** for under trace and glass—noir-adjacent, still **fiction** and educational.
- **Procedural, not chatty.** Handlers and systems speak in **ops briefs**, **legal boilerplate**, and **intel stubs**—never wink-at-camera fourth-wall unless Easter egg.
- **Educational spine:** copy may reference real *classes* of vulns (CVE families, SQLi patterns) but **missions are fiction**; no real orgs, no real targets.
- **Dry humor:** allowed in mail `Subject:` lines and file `content`, not in tutorial failure text (keep failures instructive).

## Factions (canonical names)

| Name | Role |
|------|------|
| **Orithmic** (broker) | Assigns operators; fictional parent for the web build demo strings. |
| **Orion Logistics** | **m1-ghost-proxy** client—staging network, billing evidence. |
| **Helix** | Trust / arbitration umbrella; **legal-alerts** mail tone. |
| **Orion internal** | **intel-feed**—unofficial topology hints. |

## IM threads (ShadowNet — fiction)

| Thread | Voice | Notes |
|--------|--------|--------|
| **Contract client** | Procedural alias (`contact-alias.mjs`); handler cut-out. | Primary mission pings (`edge_listed`, `probe_gw`, `connect_gw`, harvest). |
| **Amanda** | Childhood friend; warm, worried. | First personal ping after **probe gw-edge**; long-term arc: **she is not what she seems** (robot / synthetic — reveal in a later mission, not m1). |
| **ORION·INT (corporate)** | Dry compliance / risk telemetry. | Forwarded “through the client’s cut-out”; warns when **SOC / tracking pressure** spikes (`soc_alert`). |

## Operator fantasy

- **You are not “the main character of the internet”.** You are one **slot** in a queue with **trace budget** and **SOC** pressure.
- **Mail** is diegetic: mission JSON `emails[]` is “deployed package” fiction—**not** a real SMTP client.

## Twist space (future campaigns)

Reserve long-form meta (e.g. iteration / identity loops) for **separate missions** or **debrief pages**—**m1** stays a clean tutorial-adjacent op unless explicitly expanded. **Amanda’s** later **robot / synthetic** reveal should land in a future mission, not by rewriting m1 IM lines.

## Mission JSON hooks

- `story.handler`, `story.time`, `story.region` — banner fiction.
- `story.debrief.success` / `fail` — pager outcomes.
- `emails[]` — `{ id, from, subject, body }` — in-game inbox (`mail` / `mail read <id>`).

## Voice checklist (before ship)

- [ ] No real company names as villains.
- [ ] Artifacts / files labeled **fiction** where needed.
- [ ] `mail` bodies wrap legally in-universe (Helix terms, etc.) without real legal advice.
