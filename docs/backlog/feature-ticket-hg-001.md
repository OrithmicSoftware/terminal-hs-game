# Feature Ticket: hg-001

Feature ID: hg-001  
Title: Hacker Terminal Campaign Foundation  
Owner: AI Studio Team  
Status: approved  
Priority: P1

## Problem

There is no reusable terminal hacking game framework with campaign progression and mission authoring standards.

## Goal

Ship a safe simulation framework with one handcrafted mission, procedural mission generation, SOC tension mechanics, and campaign persistence.

## Scope

- In:
  - mission engine with network nodes/services/files
  - trace meter and failure threshold
  - SOC event/countermeasure loop
  - save/load campaign progression + session snapshot
  - mission schema and starter docs
- Out:
  - real networking or exploitation code
  - multiplayer
  - graphical UI beyond terminal

## Acceptance Criteria

- [ ] Player can complete handcrafted mission end-to-end.
- [ ] At least 4 procedural missions are available in campaign.
- [ ] Campaign state survives process restart.
- [ ] SOC alerts trigger and can be mitigated with dedicated commands.
- [ ] Mission author can add a new mission JSON without changing engine code.
