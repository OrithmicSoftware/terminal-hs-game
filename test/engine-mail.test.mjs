import test from "node:test";
import assert from "node:assert/strict";
import { createMissionSession } from "../src/engine.mjs";

const miniMission = {
  id: "mail-test",
  title: "Mail test",
  brief: "test",
  startNode: "local",
  security: { maxTrace: 99 },
  objective: {
    summary: "x",
    requiredNode: "local",
    exfilFiles: [],
  },
  edges: [],
  nodes: [
    {
      id: "local",
      services: [],
      noise: { enum: 0 },
      files: [],
    },
  ],
  emails: [
    {
      id: "t1",
      from: "ops@example.com",
      subject: "Hello",
      body: "Body text",
    },
  ],
};

test("createMissionSession loads emails from mission JSON", () => {
  const session = createMissionSession(miniMission);
  assert.equal(session.state.mail.length, 1);
  assert.equal(session.state.mail[0].id, "t1");
  assert.equal(session.state.mail[0].read, false);
});

test("serialize round-trips mail read state", () => {
  const session = createMissionSession(miniMission);
  session.state.mail[0].read = true;
  const snap = session.serialize();
  assert.ok(Array.isArray(snap.mailState));
  assert.equal(snap.mailState[0].id, "t1");
  assert.equal(snap.mailState[0].read, true);

  const session2 = createMissionSession(miniMission, snap);
  assert.equal(session2.state.mail[0].read, true);
});

test("serialize round-trips phishingBeatDone", () => {
  const session = createMissionSession(miniMission);
  assert.equal(session.state.phishingBeatDone, false);
  session.state.phishingBeatDone = true;
  const snap = session.serialize();
  assert.equal(snap.phishingBeatDone, true);
  const session2 = createMissionSession(miniMission, snap);
  assert.equal(session2.state.phishingBeatDone, true);
});
