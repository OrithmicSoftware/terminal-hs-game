import test from "node:test";
import assert from "node:assert/strict";

import { animatePhraseDecode } from "../src/word-decode.mjs";

test("animatePhraseDecode reveals final phrase", async () => {
  const phrase = "hello world";
  const frames = [];
  const renderFn = (text) => frames.push(text);

  // Run with minimal delays so test completes quickly.
  await animatePhraseDecode(phrase, renderFn, { frameMs: 0, revealPerCharMs: 0 });

  assert.ok(frames.length > 0, "should have emitted frames");
  const last = frames[frames.length - 1];
  assert.equal(last, phrase, "final rendered text must equal original phrase");
});

test("animatePhraseDecode does not show unrevealed words as plain text on first frame", async () => {
  const phrase = "alpha beta";
  const frames = [];
  const renderFn = (text) => frames.push(text);

  await animatePhraseDecode(phrase, renderFn, { frameMs: 0, revealPerCharMs: 0 });

  assert.ok(frames.length > 0, "should have emitted frames");
  assert.notEqual(frames[0], phrase, "first frame should not already be fully decoded");
  assert.ok(!frames[0].includes("beta"), "future words should be masked until reveal reaches them");
});
