# jspsych-humancheck

[![ci](https://github.com/capro-uio/jspsych-humancheck/actions/workflows/ci.yml/badge.svg)](https://github.com/capro-uio/jspsych-humancheck/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@jspsych-contrib/extension-humancheck)](https://www.npmjs.com/package/@jspsych-contrib/extension-humancheck)

Development repository for **[`@jspsych-contrib/extension-humancheck`][npm]**, a jsPsych extension
that collects evidence a participant is a bot or an AI agent rather than a person, and scores each
session without blocking anyone.

> **Using it in a study?** You do not need this repository. Install the published package:
>
> ```html
> <script src="https://unpkg.com/@jspsych-contrib/extension-humancheck"></script>
> ```
>
> The user-facing documentation lives in
> [`packages/extension-humancheck/docs`](packages/extension-humancheck/docs/extension-humancheck.md).

## Why this repo exists

The package is published through [jspsych-contrib][contrib], which gets it into the community
listing and under the `@jspsych-contrib` scope. Contrib's CI runs a build and unit tests across all
of its packages, and has no room for per-package tooling.

That is not enough for this package. Its entire claim is detection accuracy, and the only way to
check that claim is adversarially: drive a real browser as a bot and assert the right flags fire,
then drive it as a person and assert none do. So development, issues and the full check suite live
here, and contrib receives a mirror of the package at release time.

```
jspsych-humancheck (this repo)          jspsych-contrib
  packages/extension-humancheck/  ───▶    packages/extension-humancheck/
  .changeset/                     ───▶    .changeset/
  e2e/ scripts/ .github/                  (not mirrored: dev-only tooling)
                                                      │
                                                      ▼
                                   npm: @jspsych-contrib/extension-humancheck
```

The layout deliberately mirrors contrib's, so syncing is a directory copy rather than a file list
that can quietly drift.

## Layout

| Path                            | What it is                                                           |
| ------------------------------- | -------------------------------------------------------------------- |
| `packages/extension-humancheck` | The package itself. This is what is mirrored into contrib.            |
| `e2e/`                          | Adversarial Playwright suite: bot runs, human runs, environment runs. |
| `scripts/sync-contrib.mjs`      | Mirrors the package into a contrib checkout, or checks it for drift.  |
| `.changeset/`                   | Changesets, mirrored to contrib's root where their release reads them. |

The root `package.json` is private and exists only to hold dev tooling, so Playwright and the local
server never end up in the published package's dependencies.

## Development

```sh
npm install
npm run build            # rollup, via @jspsych/config
npm test                 # jest unit tests
npm run e2e              # adversarial Playwright suite, all three engines
```

First run of the E2E suite needs browsers: `npm run e2e:install`.

### Checks

| Check                | Where       | What it protects                                                     |
| -------------------- | ----------- | ---------------------------------------------------------------------- |
| Build + unit tests   | Node 18/20/22 | 18 and 20 match contrib's CI, so the mirror cannot break their build. |
| Coverage gate        | Node 20     | New detection branches cannot ship untested.                           |
| Adversarial E2E      | Chromium, Firefox, WebKit | That bots are caught and people are not, on every engine.  |
| Citation metadata    | Node 20     | `CITATION.cff` cannot drift from the package version.                  |

Coverage thresholds are passed on the command line in CI rather than written into the package's
`jest.config.cjs`, because that file is mirrored into contrib and a failing gate there would break
their build instead of ours.

### A note on the E2E suite

Playwright sets `navigator.webdriver` on every engine, so a run would be flagged on that signal
alone. The bot and human suites therefore hide it deliberately, forcing the *behavioural* detectors
to do the work; `e2e/environment.spec.ts` leaves it alone and asserts it is caught.

The human-likeness test asserts only on behavioural flags. A headless browser genuinely trips the
environment checks (no `window.chrome`, a `0x0` outer window), and asserting a clean environment
score there would be testing a lie.

## Citation and DOI

Archived on Zenodo: [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23541522.svg)](https://doi.org/10.5281/zenodo.23541522)

`10.5281/zenodo.23541522` is the **concept DOI**: it always resolves to the newest archived
version, so a citation does not pin readers to whichever release was current when they looked.
Each release also gets its own version DOI.

The citation is authored once, in
[`packages/extension-humancheck/CITATION.cff`](packages/extension-humancheck/CITATION.cff), and the
build compiles it into the extension's `info.citations`, so `jsPsych.getCitations()` returns a
citation carrying the DOI and ORCID.

### Why there are two copies of CITATION.cff

**Zenodo and GitHub only read `CITATION.cff` from the repository root.** The authored copy lives in
the package directory, because that is what the contrib mirror needs, so an identical copy sits at
the repository root for Zenodo and GitHub's "Cite this repository" widget.

This is not cosmetic. The v0.1.0 release was archived before the root copy existed, and Zenodo
silently fell back to GitHub profile metadata: no ORCID, no keywords, the wrong author string and a
default title. There is no error when this happens, only a record that quietly misattributes the
work. `npm run check:citation` now fails if the root copy is missing or has drifted.

There is deliberately **no `.zenodo.json`**: if both exist, Zenodo ignores `CITATION.cff` entirely.

### Releasing a new version to Zenodo

Publishing a GitHub release fires the Zenodo webhook, which archives the tag and mints a version
DOI under the same concept DOI. Keep `version` and `date-released` in `CITATION.cff` current first,
which `npm run sync:pull` does, or the archived record will describe the wrong release.

## Releasing

Versions are bumped by contrib's changesets workflow, not here, so a release is a round trip:

```sh
npm run sync:contrib -- --contrib ../jspsych-contrib   # push the package across
# open and merge the contrib PR; their release workflow publishes to npm
npm run sync:pull    -- --contrib ../jspsych-contrib   # bring the version and CHANGELOG back
```

`--pull` also updates `version` and `date-released` in `CITATION.cff`, because the Zenodo record
must describe the version it is archiving. `npm run check:citation` enforces that in CI.

Then tag and publish the GitHub release so Zenodo archives the new version.

## Mirroring to contrib

After `sync:contrib`, in the contrib checkout: `npm install`, `npm run update-readme`, commit on a
branch, and open a pull request. Publishing happens from contrib's release workflow on merge.

To check the mirror has not drifted without writing anything:

```sh
node scripts/sync-contrib.mjs --contrib ../jspsych-contrib --check
```

## Licence

MIT

[npm]: https://www.npmjs.com/package/@jspsych-contrib/extension-humancheck
[contrib]: https://github.com/jspsych/jspsych-contrib
