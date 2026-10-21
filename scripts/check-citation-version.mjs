#!/usr/bin/env node
/**
 * Keep CITATION.cff in step with the package version.
 *
 * The citation file is what GitHub shows, what Zenodo archives against the DOI, and what the build
 * bakes into the extension's `info.citations`. If it drifts from package.json, every one of those
 * describes the wrong version.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packageDir = join(repoRoot, "packages/extension-humancheck");

const { version } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const citation = readFileSync(join(packageDir, "CITATION.cff"), "utf8");
const cited = citation.match(/^version: *"?([^"\n]+)"?$/m)?.[1]?.trim();

if (cited !== version) {
  console.error(`✗ CITATION.cff says version ${cited ?? "(missing)"}, package.json says ${version}.`);
  console.error("  Run: npm run sync:pull -- --contrib ../jspsych-contrib");
  process.exit(1);
}

if (!/^date-released:/m.test(citation)) {
  console.error("✗ CITATION.cff has no date-released.");
  process.exit(1);
}

console.log(`✓ CITATION.cff and package.json agree on ${version}.`);
