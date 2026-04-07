#!/usr/bin/env node
import { animatePhraseDecode } from "../src/word-decode.mjs";

function usage() {
  console.log("Usage: npm run demo:animate-text -- [text to animate]");
}

const argv = process.argv.slice(2).filter((a) => a !== "--");
if (argv.length === 0) {
  usage();
  process.exit(0);
}

const text = argv.join(" ");

(async () => {
  // Render function overwrites the current line; supports multi-line by simple write.
  const render = (s) => {
    try {
      // Clear line and write
      process.stdout.write("\x1b[2K\r" + s);
    } catch (e) {
      // fallback
      console.log(s);
    }
  };

  await animatePhraseDecode(text, render, { frameMs: 70, revealPerCharMs: 28 });
  process.stdout.write("\n");
})();
