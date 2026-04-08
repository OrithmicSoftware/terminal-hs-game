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

test("animatePhraseDecode starts with randomized broken symbols instead of one repeated rectangle", async () => {
  const phrase = "alpha beta";
  const frames = [];
  const renderFn = (text) => frames.push(text);
  const randomSeq = [0.01, 0.15, 0.29, 0.43, 0.57, 0.71, 0.85, 0.99];
  let i = 0;
  const randomFn = () => {
    const v = randomSeq[i % randomSeq.length];
    i += 1;
    return v;
  };

  await animatePhraseDecode(phrase, renderFn, { frameMs: 0, revealPerCharMs: 0, randomFn });

  assert.ok(frames.length > 0, "should have emitted frames");
  const firstFrame = frames[0];
  const maskedFutureWord = firstFrame.split(" ")[1];
  assert.ok(maskedFutureWord, "first frame should include a masked future word");
  assert.notEqual(maskedFutureWord, "▯▯▯▯", "future word should not render as one repeated rectangle");
  assert.ok(new Set(maskedFutureWord).size > 1, "future word mask should contain varied symbols");
});
