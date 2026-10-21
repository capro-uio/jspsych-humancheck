# jspsych-humancheck

[![ci](https://github.com/drmowinckels/jspsych-humancheck/actions/workflows/ci.yml/badge.svg)](https://github.com/drmowinckels/jspsych-humancheck/actions/workflows/ci.yml)
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

Citation metadata lives in a single place,
[`packages/extension-humancheck/CITATION.cff`](packages/extension-humancheck/CITATION.cff). GitHub
renders it as "Cite this repository", Zenodo reads it when archiving a release, and the build bakes
it into the extension's `info.citations`, so `jsPsych.getCitations()` returns the real citation.

There is deliberately **no `.zenodo.json`**: if both files exist Zenodo ignores `CITATION.cff`
entirely, which would leave two sources of truth that drift apart.

### Minting the DOI (first time only)

Zenodo issues the DOI *when a release is published*, so the first release cannot contain its own
DOI. This is a two-step bootstrap:

1. Push this repository to GitHub and make it public.
2. Enable it in [Zenodo's GitHub settings](https://zenodo.org/account/settings/github/).
3. Publish release `v0.1.0`. Zenodo archives it and mints two DOIs: a **version DOI** for that
   release, and a **concept DOI** that always resolves to the newest version.
4. Uncomment `doi:` in `CITATION.cff` and set it to the **concept DOI**, so citations follow the
   package rather than pinning readers to `v0.1.0`. Commit it.

From the next release onwards the archived snapshot carries its own DOI, and the APA and BibTeX
strings compiled into the package include it too.

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
