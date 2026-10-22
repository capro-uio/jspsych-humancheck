#!/usr/bin/env node
/**
 * Keep the citation metadata honest.
 *
 * Two copies of CITATION.cff exist on purpose and must stay identical:
 *
 *   packages/extension-humancheck/CITATION.cff  the authored copy. It ships in the contrib mirror
 *                                               and the build compiles it into info.citations.
 *   CITATION.cff                                a copy at the repository root, because Zenodo and
 *                                               GitHub's "Cite this repository" widget only look
 *                                               there. Without it Zenodo silently falls back to
 *                                               GitHub profile metadata and drops the ORCID.
 *
 * The version in them must also match package.json, or the DOI record describes the wrong release.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packageDir = join(repoRoot, "packages/extension-humancheck");

const fail = (message, hint) => {
  console.error(`✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
};

const { version } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

let packageCitation;
let rootCitation;
try {
  packageCitation = readFileSync(join(packageDir, "CITATION.cff"), "utf8");
} catch {
  fail("packages/extension-humancheck/CITATION.cff is missing.");
}
try {
  rootCitation = readFileSync(join(repoRoot, "CITATION.cff"), "utf8");
} catch {
  fail(
    "CITATION.cff is missing from the repository root.",
    "Zenodo and GitHub only read the root copy. Run: cp packages/extension-humancheck/CITATION.cff CITATION.cff",
  );
}

if (packageCitation !== rootCitation) {
  fail(
    "The root CITATION.cff differs from the package copy.",
    "Run: cp packages/extension-humancheck/CITATION.cff CITATION.cff",
  );
}

const cited = packageCitation.match(/^version: *"?([^"\n]+)"?$/m)?.[1]?.trim();
if (cited !== version) {
  fail(
    `CITATION.cff says version ${cited ?? "(missing)"}, package.json says ${version}.`,
    "Run: npm run sync:pull -- --contrib ../jspsych-contrib",
  );
}

if (!/^date-released:/m.test(packageCitation)) fail("CITATION.cff has no date-released.");
if (!/^date-released: \d{4}-\d{2}-\d{2}\s*$/m.test(packageCitation)) {
  fail(
    "date-released must be an unquoted YYYY-MM-DD date.",
    "CFF types it as a date, and the citation-js version pinned in jspsych-contrib rejects a quoted string, building empty citations instead of failing.",
  );
}
if (!/orcid:/.test(packageCitation)) fail("CITATION.cff has no ORCID, so Zenodo will not record one.");
if (!/^doi:/m.test(packageCitation)) {
  console.warn("! CITATION.cff has no doi yet. Add the Zenodo concept DOI after the first release.");
}

console.log(`✓ CITATION.cff (root and package) agree with package.json on ${version}, with ORCID and DOI.`);
