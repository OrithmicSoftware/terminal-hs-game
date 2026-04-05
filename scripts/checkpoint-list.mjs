#!/usr/bin/env node
import { CHECKPOINTS } from "../src/checkpoints.mjs";

for (const c of CHECKPOINTS) {
  console.log(`${c.id.padEnd(24)} ${c.description}`);
}
