/**
 * Tests for `cipher`, `crack`, and `patch` mini game commands.
 * Verifies that each command runs, produces the expected output,
 * and handles correct/incorrect choices.
 */
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionSession } from "../src/engine.mjs";
import { setWaitDirectionImpl, setWaitEnterContinueImpl, setWaitChoiceImpl } from "../src/ui.mjs";
import { CIPHER_PUZZLES, CRACK_PUZZLES, PATCH_PUZZLES, INFILTRATE_PUZZLES } from "../src/mini-games.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const m1Path = path.join(__dirname, "../missions/m1-ghost-proxy.json");

function captureConsoleLog() {
  const lines = [];
  const orig = console.log;
  console.log = (...args) => {
    lines.push(args.map(String).join(" "));
    orig(...args);
  };
  return {
    lines,
    restore: () => {
      console.log = orig;
    },
  };
}

function loadM1() {
  return JSON.parse(fs.readFileSync(m1Path, "utf8"));
}

beforeEach(() => {
  process.env.NO_ANIM = "1";
  process.env.HKTM_E2E = "1";
});

afterEach(() => {
  delete process.env.HKTM_E2E;
  delete process.env.NO_ANIM;
  setWaitDirectionImpl(null);
  setWaitEnterContinueImpl(null);
  setWaitChoiceImpl(null);
});

// ── cipher command ─────────────────────────────────────────────────────────

test("cipher: runs all puzzles with correct answers and shows CIPHER CHALLENGE COMPLETE", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-cipher-correct" });

  // Always pick the correct answer for each puzzle
  const correctChoices = CIPHER_PUZZLES.map((p) => p.correctIdx + 1); // 1-indexed
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("cipher");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("CIPHER CHALLENGE COMPLETE"),
    `expected CIPHER CHALLENGE COMPLETE in output:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("Correct"),
    `expected Correct feedback in output:\n${blob.slice(0, 2000)}`,
  );
});

test("cipher: wrong then correct answer shows reject feedback then advances", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-cipher-wrong" });

  // For puzzle 1: pick a wrong option first, then the correct one, then correct for the rest
  const numOptions = CIPHER_PUZZLES[0].options.length;
  const p0wrong = (CIPHER_PUZZLES[0].correctIdx + 1) % numOptions + 1; // a wrong 1-indexed choice
  const p0correct = CIPHER_PUZZLES[0].correctIdx + 1;
  const restCorrect = CIPHER_PUZZLES.slice(1).map((p) => p.correctIdx + 1);
  const choices = [p0wrong, p0correct, ...restCorrect];
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(choices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("cipher");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("Not quite"),
    `expected "Not quite" feedback for wrong answer:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("CIPHER CHALLENGE COMPLETE"),
    `expected CIPHER CHALLENGE COMPLETE after retry:\n${blob.slice(0, 2000)}`,
  );
});

test("cipher: does not add trace to game state", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-cipher-trace" });
  const initialTrace = session.state.trace;

  const correctChoices = CIPHER_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("cipher");
  } finally {
    cap.restore();
  }

  assert.equal(
    session.state.trace,
    initialTrace,
    "cipher should not add trace",
  );
});

// ── crack command ──────────────────────────────────────────────────────────

test("crack: runs all puzzles with correct answers and shows HASH CRACK COMPLETE", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-crack-correct" });

  const correctChoices = CRACK_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("crack");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("HASH CRACK COMPLETE"),
    `expected HASH CRACK COMPLETE in output:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("Correct"),
    `expected Correct feedback:\n${blob.slice(0, 2000)}`,
  );
});

test("crack: shows hash header and candidates for each puzzle", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-crack-header" });

  const correctChoices = CRACK_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("crack");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("CREDENTIAL HASH"),
    `expected CREDENTIAL HASH header:\n${blob.slice(0, 2000)}`,
  );
  // Check that all candidate passwords from the first puzzle appear
  for (const candidate of CRACK_PUZZLES[0].candidates) {
    assert.ok(
      blob.includes(candidate),
      `expected candidate '${candidate}' to appear:\n${blob.slice(0, 2000)}`,
    );
  }
});

test("crack: does not add trace to game state", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-crack-trace" });
  const initialTrace = session.state.trace;

  const correctChoices = CRACK_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("crack");
  } finally {
    cap.restore();
  }

  assert.equal(session.state.trace, initialTrace, "crack should not add trace");
});

// ── patch command ──────────────────────────────────────────────────────────

test("patch: runs all puzzles with correct answers and shows PATCH CHALLENGE COMPLETE", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-patch-correct" });

  const correctChoices = PATCH_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("patch");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("PATCH CHALLENGE COMPLETE"),
    `expected PATCH CHALLENGE COMPLETE in output:\n${blob.slice(0, 2000)}`,
  );
});

test("patch: shows vulnerable code snippet and vulnerability label", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-patch-code" });

  const correctChoices = PATCH_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("patch");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("VULNERABLE CODE"),
    `expected VULNERABLE CODE header:\n${blob.slice(0, 2000)}`,
  );
  // First puzzle is SQL injection
  assert.ok(
    blob.includes("SQL Injection"),
    `expected SQL Injection label:\n${blob.slice(0, 2000)}`,
  );
});

test("patch: wrong then correct answer shows 'Insufficient fix' then advances", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-patch-wrong" });

  // For puzzle 1: pick a wrong option first, then the correct one
  const numPatchOptions = PATCH_PUZZLES[0].options.length;
  const p0wrong = (PATCH_PUZZLES[0].correctIdx + 1) % numPatchOptions + 1;
  const p0correct = PATCH_PUZZLES[0].correctIdx + 1;
  const restCorrect = PATCH_PUZZLES.slice(1).map((p) => p.correctIdx + 1);
  const choices = [p0wrong, p0correct, ...restCorrect];
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(choices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("patch");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("Insufficient fix"),
    `expected "Insufficient fix" for wrong answer:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("PATCH CHALLENGE COMPLETE"),
    `expected PATCH CHALLENGE COMPLETE after retry:\n${blob.slice(0, 2000)}`,
  );
});

test("patch: does not add trace to game state", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-patch-trace" });
  const initialTrace = session.state.trace;

  const correctChoices = PATCH_PUZZLES.map((p) => p.correctIdx + 1);
  let choiceIdx = 0;
  setWaitChoiceImpl(() => Promise.resolve(correctChoices[choiceIdx++] ?? 1));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("patch");
  } finally {
    cap.restore();
  }

  assert.equal(session.state.trace, initialTrace, "patch should not add trace");
});

// ── infiltrate command ───────────────────────────────────────────────────────

test("infiltrate: runs all levels with correct answers and shows INFILTRATION ROUTE COMPLETE", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-infiltrate-correct" });

  const correctMoves = INFILTRATE_PUZZLES.flatMap((p) => p.steps.map((step) => step.options[step.correctIdx].direction));
  let moveIdx = 0;
  setWaitDirectionImpl(() => Promise.resolve(correctMoves[moveIdx++] ?? "right"));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("infiltrate");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("INFILTRATION ROUTE COMPLETE"),
    `expected INFILTRATION ROUTE COMPLETE in output:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("Clean move"),
    `expected clean move feedback in output:\n${blob.slice(0, 2000)}`,
  );
});

test("infiltrate: wrong then correct answer shows patrol warning then advances", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-infiltrate-wrong" });

  const firstStep = INFILTRATE_PUZZLES[0].steps[0];
  const firstWrong = firstStep.options.find((_, idx) => idx !== firstStep.correctIdx).direction;
  const remainingCorrect = INFILTRATE_PUZZLES.flatMap((p, puzzleIdx) =>
    p.steps
      .filter((_, stepIdx) => !(puzzleIdx === 0 && stepIdx === 0))
      .map((step) => step.options[step.correctIdx].direction),
  );
  const moves = [firstWrong, firstStep.options[firstStep.correctIdx].direction, ...remainingCorrect];
  let moveIdx = 0;
  setWaitDirectionImpl(() => Promise.resolve(moves[moveIdx++] ?? "right"));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("infiltrate");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.includes("Patrol would spot that route"),
    `expected patrol warning for wrong answer:\n${blob.slice(0, 2000)}`,
  );
  assert.ok(
    blob.includes("INFILTRATION ROUTE COMPLETE"),
    `expected INFILTRATION ROUTE COMPLETE after retry:\n${blob.slice(0, 2000)}`,
  );
});

test("infiltrate: does not add trace to game state", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-infiltrate-trace" });
  const initialTrace = session.state.trace;

  const correctMoves = INFILTRATE_PUZZLES.flatMap((p) => p.steps.map((step) => step.options[step.correctIdx].direction));
  let moveIdx = 0;
  setWaitDirectionImpl(() => Promise.resolve(correctMoves[moveIdx++] ?? "right"));
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("infiltrate");
  } finally {
    cap.restore();
  }

  assert.equal(session.state.trace, initialTrace, "infiltrate should not add trace");
});

// ── info glossary entries ──────────────────────────────────────────────────

test("info cipher: shows glossary entry for cipher command", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-info-cipher" });
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("info cipher");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.toLowerCase().includes("hex"),
    `expected hex encoding info in 'info cipher':\n${blob.slice(0, 2000)}`,
  );
});

test("info crack: shows glossary entry for crack command", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-info-crack" });
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("info crack");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.toLowerCase().includes("hash"),
    `expected hash cracking info in 'info crack':\n${blob.slice(0, 2000)}`,
  );
});

test("info patch: shows glossary entry for patch command", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-info-patch" });
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("info patch");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.toLowerCase().includes("vulnerab"),
    `expected vulnerability patching info in 'info patch':\n${blob.slice(0, 2000)}`,
  );
});

test("info infiltrate: shows glossary entry for infiltrate command", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-info-infiltrate" });
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("info infiltrate");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(
    blob.toLowerCase().includes("stealth"),
    `expected stealth-routing info in 'info infiltrate':\n${blob.slice(0, 2000)}`,
  );
});

// ── help output ────────────────────────────────────────────────────────────

test("help: lists cipher, crack, and patch commands", async () => {
  const session = createMissionSession(loadM1(), null, { contactAliasSeed: "mini-help" });
  setWaitEnterContinueImpl(() => Promise.resolve());

  const cap = captureConsoleLog();
  try {
    await session.execute("help");
  } finally {
    cap.restore();
  }

  const blob = cap.lines.join("\n");
  assert.ok(blob.includes("cipher"), `expected 'cipher' in help output:\n${blob.slice(0, 2000)}`);
  assert.ok(blob.includes("crack"), `expected 'crack' in help output:\n${blob.slice(0, 2000)}`);
  assert.ok(blob.includes("patch"), `expected 'patch' in help output:\n${blob.slice(0, 2000)}`);
  assert.ok(blob.includes("infiltrate"), `expected 'infiltrate' in help output:\n${blob.slice(0, 2000)}`);
});

// ── mini-games data ────────────────────────────────────────────────────────

test("mini-games data: CIPHER_PUZZLES has 3 puzzles with valid correctIdx", () => {
  assert.equal(CIPHER_PUZZLES.length, 3, "expected 3 cipher puzzles");
  for (const p of CIPHER_PUZZLES) {
    assert.equal(p.options.length, 3, `expected 3 options for cipher puzzle ${p.id}`);
    assert.ok(p.correctIdx >= 0 && p.correctIdx <= 2, `correctIdx out of range for ${p.id}`);
    assert.ok(p.rejectFeedback.length === 2, `expected 2 rejectFeedback entries for ${p.id}`);
  }
});

test("mini-games data: CRACK_PUZZLES has 3 puzzles with valid correctIdx", () => {
  assert.equal(CRACK_PUZZLES.length, 3, "expected 3 crack puzzles");
  for (const p of CRACK_PUZZLES) {
    assert.equal(p.candidates.length, 3, `expected 3 candidates for crack puzzle ${p.id}`);
    assert.ok(p.correctIdx >= 0 && p.correctIdx <= 2, `correctIdx out of range for ${p.id}`);
    assert.ok(p.rejectFeedback.length === 2, `expected 2 rejectFeedback entries for ${p.id}`);
  }
});

test("mini-games data: PATCH_PUZZLES has 3 puzzles with valid correctIdx", () => {
  assert.equal(PATCH_PUZZLES.length, 3, "expected 3 patch puzzles");
  for (const p of PATCH_PUZZLES) {
    assert.equal(p.options.length, 3, `expected 3 options for patch puzzle ${p.id}`);
    assert.ok(p.correctIdx >= 0 && p.correctIdx <= 2, `correctIdx out of range for ${p.id}`);
    assert.ok(p.rejectFeedback.length === 2, `expected 2 rejectFeedback entries for ${p.id}`);
  }
});

test("mini-games data: INFILTRATE_PUZZLES has valid steps and reject feedback", () => {
  assert.equal(INFILTRATE_PUZZLES.length, 3, "expected 3 infiltrate puzzles");
  for (const puzzle of INFILTRATE_PUZZLES) {
    assert.ok(Array.isArray(puzzle.steps) && puzzle.steps.length >= 3, `expected multiple steps for ${puzzle.id}`);
    for (const [idx, step] of puzzle.steps.entries()) {
      assert.ok(step.options.length >= 2 && step.options.length <= 4, `expected 2-4 options for ${puzzle.id} step ${idx + 1}`);
      assert.ok(step.correctIdx >= 0 && step.correctIdx < step.options.length, `correctIdx out of range for ${puzzle.id} step ${idx + 1}`);
      assert.equal(step.rejectFeedback.length, step.options.length - 1, `expected reject feedback for each wrong move in ${puzzle.id} step ${idx + 1}`);
      assert.ok(Array.isArray(step.board) && step.board.length >= 1, `expected board lines for ${puzzle.id} step ${idx + 1}`);
      for (const option of step.options) {
        assert.ok(["up", "down", "left", "right"].includes(option.direction), `expected arrow direction for ${puzzle.id} step ${idx + 1}`);
      }
    }
  }
});
