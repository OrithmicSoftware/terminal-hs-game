/**
 * Splits public/sounds/fallout_terminal/typing_source.mp3 into short typing_01..NN.mp3 clips.
 * Requires: npm install (dev: ffmpeg-static)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const src = path.join(webRoot, "public/sounds/fallout_terminal/typing_source.mp3");
const outDir = path.join(webRoot, "public/sounds/fallout_terminal");

const N = 10;

function parseDurationSec(stderr) {
  const m = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3]);
  return h * 3600 + min * 60 + s;
}

function main() {
  if (!ffmpeg) {
    console.error("ffmpeg-static binary not found.");
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error("Missing source file:", src);
    process.exit(1);
  }

  const probe = spawnSync(ffmpeg, ["-hide_banner", "-i", src], { encoding: "utf8" });
  const duration = parseDurationSec(probe.stderr ?? "");
  if (duration == null || duration <= 0) {
    console.error("Could not parse duration from ffmpeg -i output.");
    process.exit(1);
  }

  const slice = Math.min(0.11, Math.max(0.04, duration / N - 0.002));
  console.log(`Source duration: ${duration.toFixed(3)}s → ${N} clips × ~${slice.toFixed(3)}s`);

  for (let i = 0; i < N; i += 1) {
    const start = (i / N) * (duration - slice);
    const out = path.join(outDir, `typing_${String(i + 1).padStart(2, "0")}.mp3`);
    const args = [
      "-hide_banner",
      "-y",
      "-ss",
      String(Math.max(0, start)),
      "-i",
      src,
      "-t",
      String(slice),
      "-acodec",
      "libmp3lame",
      "-q:a",
      "4",
      out,
    ];
    const r = spawnSync(ffmpeg, args, { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(1);
    }
    console.log("Wrote", path.relative(webRoot, out));
  }

  console.log("Done. Update main.js typingFiles to list these .mp3 names.");
}

main();
