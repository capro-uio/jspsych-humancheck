# extension-humancheck

## Overview

Collects evidence that a participant is a bot or an AI agent rather than a person, and scores each
session without blocking anyone.

The extension runs passively on any trial you attach it to. It records interaction traces (pointer
movement, click geometry, key timing, pastes, focus and visibility changes, and synthetic events),
probes the browser once for signs of automation, and plants two hidden traps in the trial display: a
**honeypot** field that agents reading the DOM tend to fill, and a **canary** instruction that tells
an AI agent to type a specific word. Nothing is ever shown to a human participant, and no one is
prevented from taking part. Each session gets a score and a list of flags in the data, and you decide
what to exclude, ideally using criteria preregistered in advance.

> No client-side check can prove that a participant is human. Agents that drive a real browser
> through screenshots and OS-level input will pass many of these checks. Combine this with
> platform-level screening (for example Prolific's authenticity checks or Cloudflare Turnstile) and
> with data-quality checks in your analysis.

## Loading

### In a browser

```html
<script src="https://unpkg.com/@jspsych-contrib/extension-humancheck"></script>
```

```js
const jsPsych = initJsPsych({
  extensions: [{ type: jsPsychExtensionHumanCheck }],
  on_finish: () => {
    const summary = jsPsych.extensions.humancheck.summarize();
    console.log(summary.score, summary.flags);
  },
});

jsPsych.run([
  {
    extensions: [{ type: jsPsychExtensionHumanCheck }],
    timeline: yourTrials,
  },
]);
```

Attaching `extensions` to a parent timeline applies it to every child trial.

### With a bundler

```js
import HumanCheckExtension from "@jspsych-contrib/extension-humancheck";
```

## Compatibility

`@jspsych-contrib/extension-humancheck` requires jsPsych v8.0.0 or later.

## Documentation

See [documentation](https://github.com/jspsych/jspsych-contrib/blob/main/packages/extension-humancheck/docs/extension-humancheck.md)

## Author / Citation

Created by [Athanasia Mo Mowinckel](https://github.com/athanasiamo).
