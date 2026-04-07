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
