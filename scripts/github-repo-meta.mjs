#!/usr/bin/env node
/**
 * Update GitHub repository description, homepage, and topics (REST API).
 *
 * Requires `GITHUB_TOKEN` or `GH_TOKEN` with **public_repo** (or **repo** for private).
 *
 * Usage:
 *   $env:GITHUB_TOKEN = "<pat>"; node scripts/github-repo-meta.mjs
 *   # or: gh auth login && gh repo edit OrithmicSoftware/terminal-hs-game --description "..."
 *
 * GitHub does not support a per-repository avatar; the listing uses the org logo.
 * For link previews, set **Social preview** in the repo Settings → General (upload a PNG).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const owner = "OrithmicSoftware";
const repo = "terminal-hs-game";
const description = String(pkg.description ?? "").trim();
const homepage = String(pkg.homepage ?? `https://github.com/${owner}/${repo}#readme`).trim();
const topics = [
  "terminal",
  "game",
  "cli",
  "javascript",
  "nodejs",
  "education",
  "hacking-simulation",
  "browser-game",
];

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function githubApi(method, pathname, body) {
  const url = `https://api.github.com${pathname}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "terminal-hs-game-github-repo-meta",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${pathname} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  if (!token) {
    console.error("Missing GITHUB_TOKEN or GH_TOKEN. Example (PowerShell):");
    console.error(`  $env:GITHUB_TOKEN = "<personal-access-token>"; node scripts/github-repo-meta.mjs`);
    console.error("Or use GitHub CLI (interactive):");
    console.error(`  gh auth login`);
    console.error(
      `  gh repo edit ${owner}/${repo} --description ${JSON.stringify(description)} --homepage ${JSON.stringify(homepage)}`,
    );
    process.exitCode = 0;
    return;
  }

  console.log(`PATCH /repos/${owner}/${repo} (description + homepage)`);
  await githubApi("PATCH", `/repos/${owner}/${repo}`, {
    description,
    homepage,
  });

  console.log(`PUT /repos/${owner}/${repo}/topics`);
  await githubApi("PUT", `/repos/${owner}/${repo}/topics`, {
    names: topics,
  });

  console.log("Done. Refresh https://github.com/" + owner + "/" + repo);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
