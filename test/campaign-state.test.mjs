import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCampaignState, ensureCampaignConsistency } from "../src/campaign-state.mjs";

const fakeMissions = [
  { id: "m1" },
  { id: "pg-001" },
  { id: "pg-002" },
];

test("createInitialCampaignState locks missions and activates first", () => {
  const s = createInitialCampaignState(fakeMissions);
  assert.equal(s.schemaVersion, 2);
  assert.equal(typeof s.contactAliasSeed, "string");
  assert.ok(s.contactAliasSeed.length > 0);
  assert.equal(s.missions.length, 3);
  assert.equal(s.missions[0].status, "locked");
  assert.equal(s.missions[1].status, "locked");
  assert.deepEqual(s.ghostChatMessages, []);
  assert.equal(s.ghostChatLastBriefedMissionId, null);
});

test("ensureCampaignConsistency repairs schema and preserves length", () => {
  const s = {
    schemaVersion: 1,
    currentMissionIndex: 0,
    tutorialEnabled: true,
    language: "ru",
    uiMode: "pip",
    typing: true,
    beep: false,
    missions: [
      { missionId: "m1", status: "active", snapshot: null },
      { missionId: "pg-001", status: "locked", snapshot: null },
      { missionId: "pg-002", status: "locked", snapshot: null },
    ],
  };
  const out = ensureCampaignConsistency(s, fakeMissions);
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.language, "en");
  assert.deepEqual(out.ghostChatMessages, []);
  assert.equal(out.ghostChatLastBriefedMissionId, null);
});

test("ensureCampaignConsistency adds contactAliasSeed when missing", () => {
  const s = createInitialCampaignState(fakeMissions);
  delete s.contactAliasSeed;
  const out = ensureCampaignConsistency(s, fakeMissions);
  assert.equal(typeof out.contactAliasSeed, "string");
  assert.ok(out.contactAliasSeed.length > 0);
});

test("ensureCampaignConsistency resets when mission count mismatches", () => {
  const bad = {
    schemaVersion: 2,
    currentMissionIndex: 0,
    tutorialEnabled: true,
    language: "en",
    uiMode: "pip",
    typing: true,
    beep: false,
    missions: [{ missionId: "m1", status: "active", snapshot: null }],
  };
  const out = ensureCampaignConsistency(bad, fakeMissions);
  assert.equal(out.missions.length, 3);
  assert.equal(out.missions[0].status, "active");
});
