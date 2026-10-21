// jsPsych touches `window` at module scope, so the DOM has to exist before the require below.
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "screen"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true });
}
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

const required = require("@jspsych-contrib/extension-humancheck");
const HumanCheck = required.default ?? required;

if (typeof HumanCheck !== "function" || HumanCheck.info.name !== "humancheck") {
  console.log("  ✗ require() did not yield the extension");
  process.exit(1);
}
if (typeof HumanCheck.scoreSession !== "function") {
  console.log("  ✗ static helpers missing from the CJS build");
  process.exit(1);
}
if (
  HumanCheck.scoreSession({
    environment: null,
    behaviors: [],
    checks: [{ honeypot_filled: true, canary_triggered: false, attention_failed: null }],
  }).score !== 0.8
) {
  console.log("  ✗ scoring through the CJS build gave the wrong result");
  process.exit(1);
}
console.log("  ✓ require() yields the extension, its statics and correct scoring");
