#!/usr/bin/env node
/**
 * Verify the package as a consumer receives it, not as the repo sees it.
 *
 * The unit tests import from `src`, so a broken build or packaging config would never fail them.
 * This packs the tarball, installs it into a throwaway project, and exercises the published entry
 * points: ESM, CJS, the bundled type declarations, a real jsPsych run and the CSV columns.
 *
 * The browser build is covered separately: e2e/fixture.html loads dist/index.browser.min.js.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packageDir = join(repoRoot, "packages/extension-humancheck");
const fixtures = join(repoRoot, "scripts/smoke");

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });

const workspace = mkdtempSync(join(tmpdir(), "humancheck-smoke-"));
let tarball;

try {
  console.log("• packing the tarball");
  run("npm", ["pack", "--silent"], packageDir);
  tarball = readdirSync(packageDir).find((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack produced no tarball");

  console.log("• installing it into a throwaway project");
  writeFileSync(
    join(workspace, "package.json"),
    `${JSON.stringify({ name: "humancheck-smoke", private: true, type: "module" }, null, 2)}\n`,
  );
  run(
    "npm",
    [
      "install",
      "--silent",
      join(packageDir, tarball),
      "jspsych@8",
      "jsdom",
      "@jspsych/plugin-html-button-response@2",
      "typescript@5",
    ],
    workspace,
  );

  for (const file of readdirSync(fixtures)) cpSync(join(fixtures, file), join(workspace, file));

  console.log("• ESM entry point");
  process.stdout.write(run("node", ["check.mjs"], workspace));

  console.log("• CJS entry point");
  process.stdout.write(run("node", ["check.cjs"], workspace));

  console.log("• published type declarations");
  run("npx", ["tsc"], workspace);
  console.log("  ✓ declarations typecheck under strict mode");

  console.log("\n✓ The published package works as a consumer receives it.");
} catch (error) {
  console.error("\n✗ Published package smoke test failed.\n");
  const stdout = error.stdout?.toString();
  const stderr = error.stderr?.toString();
  if (stdout) console.error(stdout);
  console.error(stderr || error.message);
  process.exitCode = 1;
} finally {
  if (tarball) rmSync(join(packageDir, tarball), { force: true });
  rmSync(workspace, { recursive: true, force: true });
}
