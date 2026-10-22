#!/usr/bin/env node
/**
 * Copy the package into a jspsych-contrib checkout, ready for a pull request.
 *
 * This repository mirrors contrib's own layout (packages/extension-humancheck, .changeset), so the
 * sync is a directory copy rather than a file list that can drift. Dev-only tooling lives at the
 * root of this repo and is never copied.
 *
 *   node scripts/sync-contrib.mjs --contrib ../jspsych-contrib [--check|--pull]
 *
 * --check exits non-zero if the copy would change anything, for use in CI to catch drift.
 * --pull  brings back the two things contrib's release process owns rather than this repo: the
 *         version in package.json and the generated CHANGELOG. Without it the mirror would read as
 *         permanently out of sync after every release.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const PACKAGE_DIR = "packages/extension-humancheck";
const SKIP = new Set(["node_modules", "dist", "coverage", ".DS_Store"]);

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const pullBack = args.includes("--pull");
const contribRoot = resolve(valueOf("--contrib") ?? "../jspsych-contrib");
const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function valueOf(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!existsSync(join(contribRoot, "packages"))) {
  fail(`${contribRoot} does not look like a jspsych-contrib checkout (no packages/ directory).`);
}

/** Every file under dir, relative to it, ignoring build output and dependencies. */
function filesUnder(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP.has(entry)) return [];
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full, base) : [relative(base, full)];
  });
}

const source = join(repoRoot, PACKAGE_DIR);
const target = join(contribRoot, PACKAGE_DIR);

const changed = filesUnder(source).filter((file) => {
  const targetFile = join(target, file);
  if (!existsSync(targetFile)) return true;
  return readFileSync(join(source, file)).compare(readFileSync(targetFile)) !== 0;
});
const removed = filesUnder(target).filter((file) => !existsSync(join(source, file)));

if (pullBack) {
  const contribPackage = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  const localPath = join(source, "package.json");
  const localPackage = JSON.parse(readFileSync(localPath, "utf8"));
  const released = contribPackage.version;

  if (localPackage.version !== released) {
    const previous = localPackage.version;
    localPackage.version = released;
    writeFileSync(localPath, `${JSON.stringify(localPackage, null, 2)}\n`);
    console.log(`✓ version ${previous} → ${released}`);
  } else {
    console.log(`• version already ${released}`);
  }

  const changelog = join(target, "CHANGELOG.md");
  if (existsSync(changelog)) {
    cpSync(changelog, join(source, "CHANGELOG.md"));
    console.log("✓ CHANGELOG.md pulled back");
  }

  // Citation metadata has to track the release, or the DOI record describes the wrong version.
  const citationPath = join(source, "CITATION.cff");
  const today = new Date().toISOString().slice(0, 10);
  const citation = readFileSync(citationPath, "utf8")
    .replace(/^version: .*$/m, `version: ${released}`)
    // Unquoted on purpose: CFF types date-released as a date, and the citation-js version
    // pinned in jspsych-contrib rejects a quoted string, silently emitting empty citations.
    .replace(/^date-released: .*$/m, `date-released: ${today}`);
  writeFileSync(citationPath, citation);
  console.log(`✓ CITATION.cff set to ${released}, released ${today}`);

  console.log("\nCommit the result here, then tag and release so Zenodo archives it.");
  process.exit(0);
}

if (checkOnly) {
  if (changed.length === 0 && removed.length === 0) {
    console.log("✓ jspsych-contrib copy is in sync.");
    process.exit(0);
  }
  console.error("✗ jspsych-contrib copy is out of sync:");
  for (const file of changed) console.error(`    changed: ${file}`);
  for (const file of removed) console.error(`    removed: ${file}`);
  process.exit(1);
}

// Mirror exactly: stale files in the target would otherwise survive a rename.
for (const file of removed) rmSync(join(target, file));
mkdirSync(target, { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter: (path) => !SKIP.has(path.split("/").pop()),
});

const changesets = filesUnder(join(repoRoot, ".changeset")).filter((file) => file.endsWith(".md"));
mkdirSync(join(contribRoot, ".changeset"), { recursive: true });
for (const file of changesets) {
  if (file === "README.md" || file === "config.json") continue;
  cpSync(join(repoRoot, ".changeset", file), join(contribRoot, ".changeset", file));
}

console.log(`✓ Synced ${PACKAGE_DIR} into ${contribRoot}`);
console.log(`  ${changed.length} file(s) changed, ${removed.length} removed`);
console.log(`  ${changesets.length} changeset(s) copied to .changeset/`);

const version = JSON.parse(readFileSync(join(source, "package.json"), "utf8")).version;
console.log("\nNext:");
console.log(`  cd ${contribRoot}`);
console.log("  npm install          # refresh the workspace lockfile");
console.log("  npm run update-readme");
console.log(`  git switch -c extension-humancheck-${version} && git add -A && git commit`);

const status = spawnSync("git", ["-C", contribRoot, "status", "--short"], { encoding: "utf8" });
if (status.stdout?.trim()) {
  console.log("\nPending changes in the contrib checkout:");
  console.log(status.stdout.trimEnd());
}
